import { Boom } from "@hapi/boom";
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  makeInMemoryStore,
  proto,
  useMultiFileAuthState,
  WAMessageContent,
  WAMessageKey,
} from "@whiskeysockets/baileys";
import MAIN_LOGGER from "@whiskeysockets/baileys/lib/Utils/logger";
import NodeCache from "node-cache";

const logger = MAIN_LOGGER.child({});
logger.level = "info";

// external map to store retry counts of messages when decryption/encryption fails
// keep this out of the socket itself, so as to prevent a message decryption/encryption loop across socket restarts
const msgRetryCounterCache = new NodeCache();

// the store maintains the data of the WA connection in memory
// can be written out to a file & read from it
const store = makeInMemoryStore({ logger });
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
      /** caching makes the store faster to send/receive messages */
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    msgRetryCounterCache,
    generateHighQualityLinkPreview: true,
    // ignore all broadcast messages -- to receive the same
    // comment the line below out
    // shouldIgnoreJid: jid => isJidBroadcast(jid),
    // implement to handle retries & poll updates
    getMessage,
  });

  store?.bind(sock.ev);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect)
      // reconnect if not logged out
      if (shouldReconnect) {
        startSock()
      }
    } else if (connection === 'open') {
      console.log('opened connection')
    }
  })

  sock.ev.on("creds.update", async () => {
    await saveCreds();
  })

  // history received
  sock.ev.on("messaging-history.set", async ({ chats, contacts, messages, isLatest }) => {
    console.log(
      `recv ${chats.length} chats, ${contacts.length} contacts, ${messages.length} msgs (is latest: ${isLatest})`
    );
  })

  // received a new message
  sock.ev.on("messages.upsert", async (upsert) => {
    console.log("recv messages ", JSON.stringify(upsert, undefined, 2));

    if (upsert.type === "notify") {
      for (const msg of upsert.messages) {
        try {
          const { default: ServiceLayer } = await import(
            "./ServiceLayer.js"
          );
          ServiceLayer.readMessage(sock, msg);
          delete require.cache[require.resolve("./ServiceLayer.js")];
        } catch (e) {
          console.log(e);
        }
      }
    }
  })

  return sock;
};

async function getMessage(
  key: WAMessageKey
): Promise<WAMessageContent | undefined> {
  if (store) {
    const msg = await store.loadMessage(key.remoteJid!, key.id!);
    return msg?.message || undefined;
  }

  // only if store is present
  return proto.Message.fromObject({});
}

startSock();
