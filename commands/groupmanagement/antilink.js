const config = require('../../config');

module.exports = {
  name: 'antilink',
  aliases: ['al', 'nolink', 'blocklink'],
  category: 'group-management',
  description: 'Manage link protection in groups',
  ownerOnly: false,
  groupOnly: true,
  usage: 'antilink on|off|warn|remove|delete',
  
  async execute({ client, msg, args, jid, sender, isOwner }) {
    try {
      // Check permissions
      const groupMeta = await client.sock.groupMetadata(jid);
      const participant = groupMeta.participants.find(p => p.id === sender);
      const isAdmin = participant?.admin || isOwner;
      
      if (!isAdmin) {
        return await client.reply(jid, '🔒 Admins only command!', msg);
      }

      const action = args[0]?.toLowerCase();
      
      if (!action) {
        const settings = await client.db.db.collection('groups').findOne({ jid });
        const anti = settings?.antiFeatures?.antilink || {};
        
        const embed = `🔗 *Antilink Settings*\n\n` +
          `Status: ${anti.enabled ? '✅ ON' : '❌ OFF'}\n` +
          `Action: ${anti.action || 'delete'}\n\n` +
          `*Usage:*\n\`antilink on\` - Enable (delete only)\n\`antilink off\` - Disable\n\`antilink warn\` - Delete + Warn\n\`antilink remove\` - Delete + Kick\n\`antilink delete\` - Delete + Warn`;
        
        return await client.sendMsg(jid, { 
          text: embed,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: config.channelJid,
              serverMessageId: -1
            }
          }
        }, { quoted: msg });
      }

      const validActions = ['on', 'off', 'warn', 'remove', 'delete'];
      if (!validActions.includes(action)) {
        return await client.reply(jid, `❌ Invalid action! Use: ${validActions.join(' | ')}`, msg);
      }

      const settings = {
        enabled: action !== 'off',
        action: action === 'on' ? 'delete' : action
      };

      await client.db.db.collection('groups').updateOne(
        { jid },
        { $set: { 'antiFeatures.antilink': settings } },
        { upsert: true }
      );

      const responses = {
        on: '✅ Antilink ENABLED - Links will be deleted',
        off: '❌ Antilink DISABLED',
        warn: '⚠️ Antilink: Delete + Warn sender',
        remove: '🚫 Antilink: Delete + Remove sender',
        delete: '🗑️ Antilink: Delete + Warn sender'
      };

      await client.reply(jid, responses[action], msg);

      // Forward to channel
      await client.sendMsg(config.channelJid, {
        text: `🔧 *Command Used*\n\n🤖 ${config.botName}\n👤 @${sender.split('@')[0]}\n📍 ${jid}\n⚙️ antilink ${action}`,
        mentions: [sender]
      });

    } catch (error) {
      console.error('Antilink error:', error);
      await client.reply(jid, `❌ Error: ${error.message}`, msg);
    }
  }
};

