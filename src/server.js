"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const service_layer_1 = __importDefault(require("./service_layer"));
const node_cache_1 = __importDefault(require("node-cache"));
const baileys_1 = __importStar(require("@whiskeysockets/baileys"));
const logger_1 = __importDefault(require("@whiskeysockets/baileys/lib/Utils/logger"));
const logger = logger_1.default.child({});
logger.level = "info";
// external map to store retry counts of messages when decryption/encryption fails
// keep this out of the socket itself, so as to prevent a message decryption/encryption loop across socket restarts
const msgRetryCounterCache = new node_cache_1.default();
// the store maintains the data of the WA connection in memory
// can be written out to a file & read from it
const store = (0, baileys_1.makeInMemoryStore)({ logger });
store === null || store === void 0 ? void 0 : store.readFromFile("./baileys_store_multi.json");
// save every 10s
setInterval(() => {
    store === null || store === void 0 ? void 0 : store.writeToFile("./baileys_store_multi.json");
}, 10000);
// start a connection
const startSock = () => __awaiter(void 0, void 0, void 0, function* () {
    const { state, saveCreds } = yield (0, baileys_1.useMultiFileAuthState)("baileys_auth_info");
    // fetch latest version of WA Web
    const { version, isLatest } = yield (0, baileys_1.fetchLatestBaileysVersion)();
    console.log(`using WA v${version.join(".")}, isLatest: ${isLatest}`);
    const sock = (0, baileys_1.default)({
        version,
        logger,
        printQRInTerminal: true,
        auth: {
            creds: state.creds,
            /** caching makes the store faster to send/receive messages */
            keys: (0, baileys_1.makeCacheableSignalKeyStore)(state.keys, logger),
        },
        msgRetryCounterCache,
        generateHighQualityLinkPreview: true,
        // ignore all broadcast messages -- to receive the same
        // comment the line below out
        // shouldIgnoreJid: jid => isJidBroadcast(jid),
        // implement to handle retries & poll updates
        getMessage,
    });
    store === null || store === void 0 ? void 0 : store.bind(sock.ev);
    // the process function lets you process all events that just occurred
    // efficiently in a batch
    sock.ev.process(
    // events is a map for event name => event data
    (events) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        // something about the connection changed
        // maybe it closed, or we received all offline message or connection opened
        if (events["connection.update"]) {
            const update = events["connection.update"];
            const { connection, lastDisconnect } = update;
            if (connection === "close") {
                // reconnect if not logged out
                if (((_b = (_a = lastDisconnect === null || lastDisconnect === void 0 ? void 0 : lastDisconnect.error) === null || _a === void 0 ? void 0 : _a.output) === null || _b === void 0 ? void 0 : _b.statusCode) !==
                    baileys_1.DisconnectReason.loggedOut) {
                    startSock();
                }
                else {
                    console.log("Connection closed. You are logged out.");
                }
            }
            console.log("connection update", update);
        }
        // credentials updated -- save them
        if (events["creds.update"]) {
            yield saveCreds();
        }
        // history received
        if (events["messaging-history.set"]) {
            const { chats, contacts, messages, isLatest } = events["messaging-history.set"];
            console.log(`recv ${chats.length} chats, ${contacts.length} contacts, ${messages.length} msgs (is latest: ${isLatest})`);
        }
        // received a new message
        if (events["messages.upsert"]) {
            const upsert = events["messages.upsert"];
            console.log("recv messages ", JSON.stringify(upsert, undefined, 2));
            if (upsert.type === "notify") {
                for (const msg of upsert.messages) {
                    service_layer_1.default.readMessage(sock, msg);
                }
            }
        }
    }));
    return sock;
});
function getMessage(key) {
    return __awaiter(this, void 0, void 0, function* () {
        if (store) {
            const msg = yield store.loadMessage(key.remoteJid, key.id);
            return (msg === null || msg === void 0 ? void 0 : msg.message) || undefined;
        }
        // only if store is present
        return baileys_1.proto.Message.fromObject({});
    });
}
startSock();
