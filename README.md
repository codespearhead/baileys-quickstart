<h1 align="center"><a href="https://github.com/codespearhead/baileys-quickstart">Baileys® Quickstart</a></h1>

<p align="center">
    <br>
  <a href="https://pixabay.com/vectors/run-sport-stand-success-ready-2872201/">
    <img src="https://cdn.pixabay.com/photo/2017/10/20/18/10/run-2872201_960_720.png" width="160px" height="120px"/>
  </a>
  <br><br>
  The quickstart with Baileys®' WhatsApp Web API you've always wanted 
  <br>
</p>

<br>

## QuickStart with Docker (Recommended)

```sh
docker compose up
```

## Manual QuickStart

> **Note**: You'll need the latest LTS version of Node installed on your system.

1. Clone the repository and cd into it:

```
git clone https://github.com/codespearhead/baileys-quickstart
cd baileys-quickstart
```

2.  Download the dependencies used in the minimal reproducible example

```
npm i
```

3. Transpile the Server.ts:

```
npm run build
```

4. Run the minimal working example:

```
npm start
```

Note that method readMessage from ServiceLayer.js will be called upon receiving a message. Implement function realBusinessLogic in that file to override the default replies, as shown in branch "whatsapp-click-to-chat".



## Usage

After scanning the QRCode, send "ping" (without quotes) to the WhatsApp account logged into the program. It'll send "pong" back.

<p align="center">
  <br>
    <img src="https://github.com/Paguiar735/whatsmeow-quickstart/raw/main/bot_in_action.jpg" width="262px" height="120px"/>
  <br><br>
</p>


## Disclaimers

> **Warning**: WhatsApp's averse to any type of automation that it considers to be "Harm[ful] to WhatsApp or [their] Users" on its platform, unless it's coming from an official WhatsApp Businesses API partner. So, it’s advisable to read WhatsApp's [Terms of Service](https://www.whatsapp.com/legal/terms-of-service) in order not to break them. Use this software at your own risk.

> **Note**: This repository was built upon the currently official [quickstart](https://github.com/WhiskeySockets/Baileys/blob/master/Example/example.ts) of Baileys®, which as of today doesn't qualify as a [MRE](https://en.wikipedia.org/wiki/Minimal_reproducible_example).

> **Note**: We are not affiliated, associated, authorized, endorsed by or in any way officially connected to WhatsApp, LLC. ([www.whatsapp.com](https://www.whatsapp.com)).

> **Note**: We are not affiliated, associated, authorized, endorsed by or in any way officially connected to Baileys®. ([https://github.com/WhiskeySockets/Baileys](https://github.com/WhiskeySockets/Baileys)).

> **Note**:
> Copyright Disclaimer under section 107 of the Copyright Act 1976, allowance is made for “fair use” for purposes such as criticism, comment, news reporting, teaching, scholarship, education and research.
> Fair use is a use permitted by copyright statute that might otherwise be infringing.
> Non-profit, educational or personal use tips the balance in favor of fair use.
