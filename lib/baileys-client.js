const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  generatePairingCode
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const { toDataURL } = require('qrcode');
const Database = require('./database');
const CommandHandler = require('./commandHandler');
const config = require('../config');

class BaileysClient {
  constructor() {
    this.config = config;
    this.db = new Database(config.mongodbUrl);
    this.sock = null;
    this.commandHandler = null;
    this.qrCode = null;
    this.pairingCode = null;
    this.phoneNumber = null;
  }

  async init() {
    await this.db.connect();
    this.commandHandler = new CommandHandler(this);
    await this.connect();
  }

  async connect() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();
    
    this.sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }))
      },
      browser: [config.botName, config.developer, config.version],
      generateHighQualityLinkPreview: true,
      syncFullHistory: false
    });

    this.sock.ev.on('creds.update', async () => {
      await saveCreds();
      await this.db.saveSession(this.sock.user?.id, state.creds);
    });

    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        // Convert QR to base64 for website
        this.qrCode = await toDataURL(qr);
        console.log('QR Code generated');
      }
      
      if (connection === 'close') {
        const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('Connection closed:', lastDisconnect.error);
        if (shouldReconnect) await this.connect();
      }
      
      if (connection === 'open') {
        console.log('✅ Bot Online:', this.sock.user?.id);
        await this.joinChannels();
      }
    });

    this.sock.ev.on('messages.upsert', async (m) => {
      if (m.type !== 'notify') return;
      const msg = m.messages[0];
      if (!msg.message) return;
      
      await this.commandHandler.checkAntiFeatures(msg);
      await this.commandHandler.handle(msg);
    });

    this.sock.ev.on('messages.update', async (updates) => {
      for (const { key, update } of updates) {
        if (update.messageStubType === 1 || update.messageStubType === 20) {
          await this.commandHandler.handleAntiDelete(key);
        }
      }
    });
  }

  // Generate pairing code for phone number
  async generatePairCode(phone) {
    try {
      this.phoneNumber = phone;
      
      // Generate 8-digit pairing code
      this.pairingCode = await generatePairingCode(this.sock, phone);
      
      return {
        success: true,
        pairCode: this.pairingCode,
        qrCode: this.qrCode
      };
    } catch (error) {
      console.error('Pair code generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async joinChannels() {
    try {
      await this.sock.chatModify({ 
        mute: null, 
        pin: false,
        archive: false 
      }, config.channelJid);
      
      console.log('📢 Joined channels successfully');
    } catch (err) {
      console.error('Channel join error:', err);
    }
  }

  async sendMsg(jid, content, options = {}) {
    return await this.sock.sendMessage(jid, content, {
      ...options,
      contextInfo: {
        ...options.contextInfo,
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: config.channelJid,
          serverMessageId: -1
        }
      }
    });
  }

  async reply(jid, text, quoted, options = {}) {
    return await this.sendMsg(jid, { text, ...options }, { quoted, ...options });
  }
}

module.exports = BaileysClient;

