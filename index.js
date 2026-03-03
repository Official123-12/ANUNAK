const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason, makeCacheableSignalKeyStore, jidDecode } = require("@whiskeysockets/baileys");
const express = require('express');
const mongoose = require('mongoose');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URL = "mongodb+srv://sila_md:sila0022@sila.67mxtd7.mongodb.net/";

mongoose.connect(MONGO_URL).then(() => console.log("ANNUNAKI DB Connected ✅"));

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
        },
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }),
        browser: ["ANNUNAKI", "Chrome", "1.1.0"]
    });

    sock.ev.on('creds.update', saveCreds);

    // MESSAGE HANDLER
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;
        
        // Load handler
        require('./handler')(sock, msg);
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('ANNUNAKI V1.1.0 IS READY 🚀');
        }
    });
}

// Pairing Code Website
app.get('/', (req, res) => {
    res.send(`<h1>ANNUNAKI BOT SERVER IS RUNNING</h1><p>Developer: STANY TECH</p>`);
});

app.listen(PORT, () => console.log(`Server on port ${PORT}`));
startBot();
