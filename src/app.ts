import { Boom } from "@hapi/boom";
import makeWASocket, {
  AnyMessageContent,
  delay,
  DisconnectReason,
  fetchLatestBaileysVersion,
  isJidBroadcast,
  makeCacheableSignalKeyStore,
  makeInMemoryStore,
  MessageRetryMap,
  useMultiFileAuthState,
} from "@adiwajshing/baileys";
import MAIN_LOGGER from "@adiwajshing/baileys/lib/Utils/logger";
import { rmdir } from "fs";

// Logger
const logger = MAIN_LOGGER.child({});
logger.level = "info";

// external map to store retry counts of messages when decryption/encryption fails
// keep this out of the socket itself, so as to prevent a message decryption/encryption loop across socket restarts
const msgRetryCounterMap: MessageRetryMap = {};

// the store maintains the data of the WA connection in memory
// can be written out to a file & read from it
const useStore = !process.argv.includes("--no-store");

const store = useStore ? makeInMemoryStore({ logger }) : undefined;
store?.readFromFile("./baileys_store_multi.json");
// save every 10s
setInterval(() => {
  store?.writeToFile("./baileys_store_multi.json");
}, 10_000);

// start a connection
const startSock = async () => {
  const { state, saveCreds } = await useMultiFileAuthState("baileys_auth_info");
  // fetch latest version of WA Web
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`using WA v${version.join(".")}, isLatest: ${isLatest}`);

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: true,
    auth: {
      creds: state.creds,
      /** caching makes the store faster to send/recv messages */
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    msgRetryCounterMap,
    generateHighQualityLinkPreview: true,
    // ignore all broadcast messages. TO receive them, comment out the line below
    shouldIgnoreJid: (jid) => isJidBroadcast(jid),
    // implement to handle retries
    getMessage: async (key) => {
      if (store) {
        const msg = await store.loadMessage(key.remoteJid!, key.id!);
        return msg?.message || undefined;
      }
      // only if store is present
      return {
        conversation: "hello",
      };
    },
  });

  store?.bind(sock.ev);

  const sendMessageWTyping = async (msg: AnyMessageContent, jid: string) => {
    await sock.presenceSubscribe(jid);
    await delay(500 + Math.floor(Math.random() * 401));

    await sock.sendPresenceUpdate("composing", jid);
    await delay(2000 + Math.floor(Math.random() * 401));

    await sock.sendPresenceUpdate("paused", jid);

    await sock.sendMessage(jid, msg);
  };

  // the process function lets you process all events that just occurred
  // efficiently in a batch
  sock.ev.process(
    // events is a map for event name => event data
    async (events) => {
      // something about the connection changed
      // maybe it closed, or we received all offline message or connection opened
      if (events["connection.update"]) {
        const update = events["connection.update"];
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
          // delete auth credentials if logged out
          if (
            (lastDisconnect?.error as Boom)?.output?.statusCode ==
            DisconnectReason.loggedOut
          ) {
            console.log("Connection closed. You are logged out.");
            rmdir("./baileys_auth_info", { recursive: true }, () => {
              console.log("Successfully deleted directory!");
            });
          }
          startSock();
        }
        console.log("connection update", update);
      }

      // If credentials were updated, save them
      if (events["creds.update"]) {
        await saveCreds();
      }

      if (events.call) {
        console.log("received call event", events.call);
      }

      // history received
      if (events["messaging-history.set"]) {
        const { chats, contacts, messages, isLatest } =
          events["messaging-history.set"];
        console.log(
          `received ${chats.length} chats, ${contacts.length} contacts, ${messages.length} msgs (is latest: ${isLatest})`
        );
      }

      // received a new message
      if (events["messages.upsert"]) {
        const upsert = events["messages.upsert"];
        console.log("recv messages ", JSON.stringify(upsert, undefined, 2));

        if (upsert.type === "notify") {
          for (const msg of upsert.messages) {
            // The text of the message is located in different places whether you just opened the chat or the chat has been open for a while
            const msg_txt =
              msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text;
            if (msg_txt) {
              console.log("replying to", msg.key.remoteJid);
              await sock!.readMessages([msg.key]);
              let msg_reply: string;
              switch (msg_txt) {
                case "ping":
                  msg_reply = "pong";
                  break;
                default:
                  msg_reply = `Click the link below to send \"ping\":\n\n\https://wa.me/${
                    sock.user.id.split(":")[0]
                  }?text=ping`;
              }
              await sendMessageWTyping({ text: msg_reply }, msg.key.remoteJid!);
            }
          }
        }
      }
    }
  );

  return sock;
};

startSock();
