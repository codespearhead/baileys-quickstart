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
    // The text of the message is located in different places whether you just opened the chat or the chat has been open for a while
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
    if (typeof this.realBusinessLogic === "function") {
      this.realBusinessLogic(sock, msg_txt, msg_destinatary);
    } else {
      let msg_reply;
      switch (msg_txt) {
        case "ping":
          await sock.sendMessage(msg_destinatary, { text: "pong" });
          break;
        case "pong":
          await this.sendMessageWithTyping(
            msg_destinatary,
            { text: "ping" },
            sock
          );
          break;
        default:
          await sock.sendMessage(msg_destinatary, {
            text: (msg_reply = `Click the link below to send \"ping\":\n\n\https://wa.me/${
              sock.user.id.split(":")[0]
            }?text=ping`),
          });
          break;
      }
    }
  }

  // Uncomment the lines below to implement your business logic
  static async realBusinessLogic(sock, msg_txt, msg_destinatary) {
    msg_txt = msg_txt.replace(/\D+/g, "");
    let msg_reply;
    switch (true) {
      case msg_txt.length === 8:
        msg_reply = `Oi, eu sou o Jarvis! Aqui está o seu link:\n\nhttps://wa.me/5592${msg_txt}`;
        break;
      case msg_txt.length > 8:
        msg_reply = `Parece que sua mensagem possui mais que oito dígitos.\n\nSegue o link considerando apenas os oito últimos dígitos de sua mensagem:\n\nhttps://wa.me/5592${msg_txt.slice(
          -8
        )}`;
        break;
      default:
        msg_reply = `Parece que sua mensagem possui menos que oito dígitos.\n\nFavor digitar os oito últimos dígitos do número de telefone desejado.`;
        break;
    }
    await sock.sendMessage(msg_destinatary, { text: msg_reply });
  }
};
