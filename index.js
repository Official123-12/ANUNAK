const { default: makeWASocket, useMultiFileAuthState, delay, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const express = require('express');
const mongoose = require('mongoose');
const pino = require('pino');
const path = require('path');
const app = express();
const MONGO_URL = "mongodb+srv://sila_md:sila0022@sila.67mxtd7.mongodb.net/";

mongoose.connect(MONGO_URL);

app.use(express.static('views'));

app.get('/pair', async (req, res) => {
    let phone = req.query.phone;
    if (!phone) return res.json({ error: "Weka namba!" });

    const { state, saveCreds } = await useMultiFileAuthState('session');
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: ["ANNUNAKI", "Chrome", "1.1.0"]
    });

    if (!sock.authState.creds.registered) {
        await delay(1500);
        let code = await sock.requestPairingCode(phone);
        res.json({ code: code });
    }

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('messages.upsert', async (m) => {
        require('./handler')(sock, m.messages[0]);
    });
});

app.listen(3000, () => console.log("Server Running on port 3000"));
