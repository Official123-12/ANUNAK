require('dotenv').config();

module.exports = {
  // Bot Info
  botName: process.env.BOT_NAME || 'ANNUNAKI',
  version: process.env.BOT_VERSION || '1.1.0',
  developer: process.env.DEVELOPER || 'STANY TECH',
  year: '2026',
  
  // JIDs
  ownerJid: process.env.OWNER_JID || '255787069580@s.whatsapp.net',
  channelJid: process.env.CHANNEL_JID || '120363404317544295@newsletter',
  groupJid: process.env.GROUP_JID || '120363406549688641@g.us',
  
  // Database
  mongodbUrl: process.env.MONGODB_URL || 'mongodb+srv://sila_md:sila0022@sila.67mxtd7.mongodb.net/',
  
  // Server
  port: process.env.PORT || 3000,
  
  // Bot Settings
  prefix: '',
  mode: process.env.MODE || 'public', // public or private
  
  // Images
  botImage: 'https://raw.githubusercontent.com/Official123-12/STANYFREEBOT-/main/IMG_1377.jpeg',
  
  // WhatsApp Preview
  websiteUrl: process.env.WEBSITE_URL || 'https://annunaki-bot.vercel.app',
  description: 'ANNUNAKI - Free WhatsApp Automation Bot with 10,000+ features. Group management, anti-delete, international commands and more!',
  
  // Features
  autoRead: true,
  autoTyping: false,
  autoRecording: false,
  alwaysOnline: true,
  
  // Anti-Features Default
  antiFeatures: {
    antilink: { enabled: false, action: 'delete' },
    antimedia: { enabled: false },
    antiscam: { enabled: false, words: [] },
    antiporno: { enabled: false },
    antitag: { enabled: false },
    antispam: { enabled: false },
    antibugs: { enabled: false }
  }
};

