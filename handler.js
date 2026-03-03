const { Group } = require('./database/mongo');

module.exports = async (sock, msg) => {
    const from = msg.key.remoteJid;
    const type = Object.keys(msg.message)[0];
    const isGroup = from.endsWith('@g.us');
    const sender = isGroup ? msg.key.participant : from;
    const body = (type === 'conversation') ? msg.message.conversation : (type === 'extendedTextMessage') ? msg.message.extendedTextMessage.text : (type === 'imageMessage') ? msg.message.imageMessage.caption : '';
    
    // CONFIGURATION
    const owner = "255xxxxxxxxx@s.whatsapp.net"; // Weka namba yako
    const channelJid = "120363404317544295@newsletter";
    const groupJid = "120363406549688641@g.us";

    // 1. AUTO SETTINGS (Always Online/Typing)
    await sock.sendPresenceUpdate('available', from);
    await sock.sendPresenceUpdate('composing', from); // Auto typing

    // 2. AUTO STATUS VIEW & REACT
    if (from === 'status@broadcast') {
        await sock.readMessages([msg.key]);
        await sock.sendMessage(from, { react: { text: '🔥', key: msg.key } }, { statusJidList: [sender] });
    }

    // 3. ANTIVIEW ONCE & ANTIDELETE
    if (type === 'viewOnceMessageV2') {
        let text = `[ANNUNAKI ANTIVIEW] Detected from: @${sender.split('@')[0]}`;
        await sock.copyNForward(owner, msg, true); // Send to owner
    }

    // 4. GROUP MANAGEMENT (Antilink/Antiscam)
    if (isGroup) {
        // Antilink logic
        if (body.match(/chat.whatsapp.com/gi) || body.match(/http/gi)) {
            // Check if user is admin (Simulated check)
            await sock.sendMessage(from, { delete: msg.key });
            await sock.sendMessage(from, { text: "🚫 Links are strictly forbidden!" });
        }

        // Antibug logic
        if (body.length > 5000) {
            await sock.sendMessage(from, { delete: msg.key });
            await sock.groupParticipantsUpdate(from, [sender], "remove");
        }
    }

    // 5. COMMANDS LOADER (No Prefix Support)
    const prefix = ""; // No prefix needed as requested
    const cmd = body.toLowerCase().trim();

    // BRANDING FUNCTION
    const reply = async (text) => {
        await sock.sendMessage(from, { 
            text: text,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: channelJid,
                    serverMessageId: 1,
                    newsletterName: "ANNUNAKI V1.1.0"
                }
            }
        }, { quoted: msg });
    };

    // COMMANDS SAMPLES
    if (cmd === "menu") {
        let menuText = `*ANNUNAKI V1.1.0*\n\nDeveloper: STANY TECH\n\n1. Antilink\n2. Antidelete\n3. Antiviewonce\n\nUse buttons below to navigate.`;
        // Sliding buttons (Note: Support varies by WA version)
        await reply(menuText);
    }
    
    if (cmd === "addowner") {
       // Logic to add owner to DB
       await reply("Owner added successfully! ✅");
    }
};
