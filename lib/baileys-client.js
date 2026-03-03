const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  getContentType
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const { toDataURL } = require('qrcode');
const Database = require('./database');
const CommandHandler = require('./commandHandler');
const config = require('../config');
const fs = require('fs');
const path = require('path');

class BaileysClient {
  constructor() {
    this.config = config;
    this.db = null;
    this.sock = null;
    this.commandHandler = null;
    this.qrCode = null;
    this.pairingCode = null;
    this.phoneNumber = null;
    this.isConnected = false;
  }

  async init() {
    try {
      // Initialize database
      if (this.config.mongodbUrl) {
        this.db = new Database(this.config.mongodbUrl);
        await this.db.connect();
        console.log('✅ Database connected');
      }
      
      // Initialize command handler
      this.commandHandler = new CommandHandler(this);
      console.log('✅ Command handler initialized');
      
      // Connect to WhatsApp
      await this.connect();
      
    } catch (error) {
      console.error('❌ Initialization error:', error);
      throw error;
    }
  }

  async connect() {
    try {
      const authFolder = path.join(__dirname, '../auth_info_baileys');
      
      // Ensure auth folder exists
      if (!fs.existsSync(authFolder)) {
        fs.mkdirSync(authFolder, { recursive: true });
      }
      
      const { state, saveCreds } = await useMultiFileAuthState(authFolder);
      const { version } = await fetchLatestBaileysVersion();
      
      console.log('📱 Connecting to WhatsApp...');
      console.log(`📦 Baileys version: <LaTex>id_2</LaTex>{pairingCode}`);
        }
        
        // Connection closed
        if (connection === 'close') {
          this.isConnected = false;
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          
          console.log('❌ Connection closed. Status:', statusCode);
          
          if (shouldReconnect) {
            console.log('🔄 Reconnecting in 5 seconds...');
            setTimeout(async () => {
              try {
                await this.connect();
              } catch (err) {
                console.error('Reconnection failed:', err);
              }
            }, 5000);
          } else {
            console.log('🚫 Logged out. Clearing auth...');
            try {
              fs.rmSync(authFolder, { recursive: true, force: true });
            } catch (err) {
              console.error('Error clearing auth:', err);
            }
          }
        }
        
        // Connection opened
        if (connection === 'open') {
          this.isConnected = true;
          console.log('\n✅ ====================================');
          console.log('✅ BOT IS ONLINE!');
          console.log('✅ Number:', this.sock.user?.id);
          console.log('✅ Name:', this.sock.user?.name);
          console.log('✅ ====================================\n');
          
          try {
            await this.joinChannels();
          } catch (err) {
            console.error('Error joining channels:', err);
          }
        }
      });

      // Handle messages
      this.sock.ev.on('messages.upsert', async (m) => {
        try {
          if (m.type !== 'notify') return;
          
          const msg = m.messages[0];
          if (!msg.message) return;
          if (msg.key.fromMe) return;
          
          if (this.commandHandler) {
            await this.commandHandler.checkAntiFeatures(msg);
            await this.commandHandler.handle(msg);
          }
        } catch (err) {
          console.error('Error handling message:', err);
        }
      });

      // Handle message updates
      this.sock.ev.on('messages.update', async (updates) => {
        try {
          for (const { key, update } of updates) {
            if (update.messageStubType === 1 || update.messageStubType === 20) {
              if (this.commandHandler) {
                await this.commandHandler.handleAntiDelete(key);
              }
            }
          }
        } catch (err) {
          console.error('Error handling message update:', err);
        }
      });

      console.log('✅ Socket initialized');
      
    } catch (error) {
      console.error('❌ Connection error:', error);
      throw error;
    }
  }

  // Generate pairing code - validates country code + 9 digits
  async generatePairCode(phone) {
    try {
      if (!this.sock) {
        throw new Error('WhatsApp socket not initialized');
      }

      // Clean phone - remove all non-digits
      const cleanPhone = phone.toString().replace(/\D/g, '');
      
      // Validate: must be country code (2-3 digits) + 9 digits = 11-12 total
      if (cleanPhone.length < 11 || cleanPhone.length > 13) {
        throw new Error('Invalid format. Use: Country Code + 9 digits (e.g., 255787069580)');
      }
      
      // Extract last 9 digits
      const localNumber = cleanPhone.slice(-9);
      
      // Validate local number is exactly 9 digits
      if (!/^\d{9}$/.test(localNumber)) {
        throw new Error('Local number must be exactly 9 digits');
      }
      
      console.log(`📱 Generating pairing code for: ${cleanPhone}`);
      console.log(`   Country code: <LaTex>id_1</LaTex>{localNumber}`);
      
      // Generate pairing code using Baileys
      const code = await this.sock.generatePairingCode(cleanPhone);
      
      this.pairingCode = code;
      this.phoneNumber = cleanPhone;
      
      console.log(`✅ Pairing code generated: ${code}`);
      
      return {
        success: true,
        pairCode: code,
        phone: cleanPhone,
        localNumber: localNumber
      };
    } catch (error) {
      console.error('❌ Pair code error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async joinChannels() {
    try {
      if (!this.config.channelJid) {
        console.log('⚠️  No channel JID configured');
        return;
      }
      
      await this.sock.chatModify({ 
        mute: null, 
        pin: false,
        archive: false 
      }, this.config.channelJid);
      
      console.log('📢 Joined channels');
