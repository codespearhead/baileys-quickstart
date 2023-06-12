module.exports = class ServiceLayer {
  static delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  static sendMessageWithTyping = async (jid, msg_txt_obj, sock) => {
    await sock.presenceSubscribe(jid);
    await this.delay(500);
    await sock.sendPresenceUpdate("composing", jid);
    await this.delay(2000);
    await sock.sendPresenceUpdate("paused", jid);
    await sock.sendMessage(jid, msg_txt_obj);
  };

  static async readMessage(sock, msg) {
    const msg_txt =
      msg?.message?.conversation || msg?.message?.extendedTextMessage?.text;
    const msg_destinatary = msg?.key?.remoteJid;
    if (sock && msg_txt && msg_destinatary) {
      console.log("replying to", msg_destinatary);
      await sock.readMessages([msg.key]);
      this.analyseMessage(sock, msg_txt, msg_destinatary);
    }
  }

  static async analyseMessage(sock, msg_txt, msg_destinatary) {
    let msg_reply;
    switch (msg_txt) {
      case "ping":
        msg_reply = "pong";
        break;
      default:
        msg_reply = `Click the link below to send \"ping\":\n\n\https://wa.me/${
          sock.user.id.split(":")[0]
        }?text=ping`;
    }
    await sock.sendMessage(msg_destinatary, { text: msg_reply });
    // await this.sendMessageWithTyping(msg_destinatary, { text: msg_reply }, sock);
  }
};
