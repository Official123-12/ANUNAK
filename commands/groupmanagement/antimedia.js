const config = require('../../config');

module.exports = {
  name: 'antimedia',
  aliases: ['am', 'nomedia', 'blockmedia'],
  category: 'group-management',
  description: 'Block media messages in groups',
  ownerOnly: false,
  groupOnly: true,
  usage: 'antimedia on|off|types:image,video,sticker',
  
  async execute({ client, msg, args, jid, sender, isOwner }) {
    try {
      const groupMeta = await client.sock.groupMetadata(jid);
      const participant = groupMeta.participants.find(p => p.id === sender);
      const isAdmin = participant?.admin || isOwner;
      
      if (!isAdmin) {
        return await client.reply(jid, '🔒 Admins only!', msg);
      }

      const action = args[0]?.toLowerCase();
      
      if (action === 'on') {
        const types = args[1]?.split(',') || ['image', 'video', 'sticker', 'audio', 'document'];
        
        await client.db.db.collection('groups').updateOne(
          { jid },
          { $set: { 
            'antiFeatures.antimedia': { 
              enabled: true, 
              types 
            } 
          }},
          { upsert: true }
        );
        
        await client.reply(jid, `✅ Antimedia ENABLED for: ${types.join(', ')}`, msg);
        
      } else if (action === 'off') {
        await client.db.db.collection('groups').updateOne(
          { jid },
          { $set: { 'antiFeatures.antimedia': { enabled: false } }},
          { upsert: true }
        );
        await client.reply(jid, '❌ Antimedia DISABLED', msg);
        
      } else {
        const settings = await client.db.db.collection('groups').findOne({ jid });
        const anti = settings?.antiFeatures?.antimedia || {};
        
        await client.sendMsg(jid, {
          text: `📎 *Antimedia Settings*\n\nStatus: ${anti.enabled ? '✅ ON' : '❌ OFF'}\nBlocked Types: ${anti.types?.join(', ') || 'all'}\n\n*Usage:*\n\`antimedia on\` - Enable all\n\`antimedia off\` - Disable\n\`antimedia on image,video\` - Block specific types`,
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

      // Forward to channel
      await client.sendMsg(config.channelJid, {
        text: `🔧 antimedia ${args.join(' ')}\n👤 @${sender.split('@')[0]}`,
        mentions: [sender]
      });

    } catch (error) {
      await client.reply(jid, `❌ Error: ${error.message}`, msg);
    }
  }
};

