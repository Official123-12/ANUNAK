const config = require('../../config');

class AntiFeaturesManager {
  constructor(db) {
    this.db = db;
  }

  async getGroupSettings(jid) {
    if (!jid.endsWith('@g.us')) return null;
    
    const group = await this.db.db.collection('groups').findOne({ jid });
    return group?.antiFeatures || config.antiFeatures;
  }

  async updateGroupSettings(jid, feature, settings) {
    await this.db.db.collection('groups').updateOne(
      { jid },
      { $set: { [`antiFeatures.${feature}`]: settings } },
      { upsert: true }
    );
  }

  async checkAntilink(msg, settings) {
    if (!settings?.enabled) return false;

    const text = msg.message?.conversation || 
                 msg.message?.extendedTextMessage?.text || '';
    
    const linkPattern = /https?:\/\/|wa\.me|chat\.whatsapp\.com|t\.me|telegram\.me/i;
    
    if (linkPattern.test(text)) {
      return {
        action: settings.action || 'delete',
        reason: 'Link detected'
      };
    }

    return false;
  }

  async checkAntimedia(msg, settings) {
    if (!settings?.enabled) return false;

    const mediaTypes = [
      'imageMessage',
      'videoMessage',
      'stickerMessage',
      'audioMessage',
      'documentMessage',
      'voiceMessage'
    ];

    const messageType = Object.keys(msg.message || {}).find(k => mediaTypes.includes(k));
    
    if (messageType) {
      return {
        action: 'delete',
        reason: `Media type: ${messageType}`,
        mediaType: messageType
      };
    }

    return false;
  }

  async checkAntiscam(msg, settings) {
    if (!settings?.enabled || !settings.words?.length) return false;

    const text = (msg.message?.conversation || '').toLowerCase();
    const scamWords = settings.words.map(w => w.toLowerCase());

    const foundWord = scamWords.find(word => text.includes(word));
    
    if (foundWord) {
      return {
        action: 'delete',
        reason: 'Scam word detected',
        word: foundWord
      };
    }

    return false;
  }

  async checkAntiporno(msg, settings) {
    if (!settings?.enabled) return false;

    const text = (msg.message?.conversation || '').toLowerCase();
    const explicitWords = ['porno', 'xxx', 'nude', 'naked', 'sex'];

    const foundWord = explicitWords.find(word => text.includes(word));
    
    if (foundWord) {
      return {
        action: 'delete',
        reason: 'Explicit content detected',
        word: foundWord
      };
    }

    return false;
  }

  async checkAntitag(msg, settings) {
    if (!settings?.enabled) return false;

    const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    
    if (mentionedJid.length > (settings.maxTags || 5)) {
      return {
        action: 'delete',
        reason: `Too many tags: ${mentionedJid.length}`
      };
    }

    return false;
  }

  async checkAntispam(msg, settings) {
    if (!settings?.enabled) return false;

    const sender = msg.key.participant || msg.key.remoteJid;
    const now = Date.now();
    
    // Get last message time
    const userData = await this.db.db.collection('users').findOne({ jid: sender });
    
    if (userData?.lastMessage) {
      const timeDiff = now - userData.lastMessage;
      
      if (timeDiff < (settings.interval || 1000)) { // Default 1 second
        return {
          action: 'warn',
          reason: 'Spam detected'
        };
      }
    }

    // Update last message time
    await this.db.db.collection('users').updateOne(
      { jid: sender },
      { $set: { lastMessage: now } },
      { upsert: true }
    );

    return false;
  }

  async checkAntibugs(msg, settings) {
    if (!settings?.enabled) return false;

    const text = msg.message?.conversation || '';
    
    // Check for bug patterns
    const bugPatterns = [
      /[\u200E\u200F\u202A-\u202E]/, // RTL/LTR marks
      /[\u{1F600}-\u{1F64F}]{50,}/u, // Too many emojis
      /^.{5000,}$/, // Very long messages
      /[\u{1F300}-\u{1F9FF}]{100,}/u // Too many symbols
    ];

    for (const pattern of bugPatterns) {
      if (pattern.test(text)) {
        return {
          action: 'delete',
          reason: 'Bug/crash message detected'
        };
      }
    }

    return false;
  }

  async executeAction(client, msg, action, reason) {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    switch (action) {
      case 'delete':
        await client.sock.sendMessage(jid, { delete: msg.key });
        await client.reply(jid, `⚠️ @${sender.split('@')[0]} ${reason}`, msg, {
          mentions: [sender]
        });
        break;

      case 'warn':
        await client.reply(jid, `⚠️ @${sender.split('@')[0]} Warning: ${reason}`, msg, {
          mentions: [sender]
        });
        break;

      case 'remove':
        await client.sock.groupParticipantsUpdate(jid, [sender], 'remove');
        await client.reply(jid, `🚫 @${sender.split('@')[0]} removed: ${reason}`, msg, {
          mentions: [sender]
        });
        break;
    }
  }
}

module.exports = AntiFeaturesManager;

