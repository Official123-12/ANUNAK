const config = require('../../config');

module.exports = {
  name: 'antiscam',
  aliases: ['ascam', 'scamblock'],
  category: 'group-management',
  description: 'Block scam words and warn members',
  ownerOnly: false,
  groupOnly: true,
  usage: 'antiscam on|off|add <word>|remove <word>|list',
  
  async execute({ client, msg, args, jid, sender, isOwner }) {
    try {
      const groupMeta = await client.sock.groupMetadata(jid);
      const participant = groupMeta.participants.find(p => p.id === sender);
      const isAdmin = participant?.admin || isOwner;
      
      if (!isAdmin) return await client.reply(jid, '🔒 Admins only!', msg);

      const subcommand = args[0]?.toLowerCase();

      if (subcommand === 'add' && args[1]) {
        const word = args.slice(1).join(' ').toLowerCase();
        
        await client.db.db.collection('groups').updateOne(
          { jid },
          { $addToSet: { 'antiFeatures.antiscam.words': word } },
          { upsert: true }
        );
        
        await client.db.db.collection('groups').updateOne(
          { jid },
          { $set: { 'antiFeatures.antiscam.enabled': true } },
          { upsert: true }
        );
        
        await client.reply(jid, `✅ Added scam word: "${word}"`, msg);
        
      } else if (subcommand === 'remove' && args[1]) {
        const word = args.slice(1).join(' ').toLowerCase();
        
        await client.db.db.collection('groups').updateOne(
          { jid },
          { $pull: { 'antiFeatures.antiscam.words': word } }
        );
        
        await client.reply(jid, `🗑️ Removed scam word: "${word}"`, msg);
        
      } else if (subcommand === 'list') {
        const settings = await client.db.db.collection('groups').findOne({ jid });
        const words = settings?.antiFeatures?.antiscam?.words || [];
        
        await client.sendMsg(jid, {
          text: `📋 *Scam Words List*\n\n${words.length ? words.map((w, i) => `${i+1}. ${w}`).join('\n') : 'No words added yet'}\n\n*Total:* ${words.length}`,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: config.channelJid,
              serverMessageId: -1
            }
          }
        }, { quoted: msg });
        
      } else if (subcommand === 'on') {
        await client.db.db.collection('groups').updateOne(
          { jid },
          { $set: { 'antiFeatures.antiscam.enabled': true } },
          { upsert: true }
        );
        await client.reply(jid, '✅ Antiscam ENABLED', msg);
        
      } else if (subcommand === 'off') {
        await client.db.db.collection('groups').updateOne(
          { jid },
          { $set: { 'antiFeatures.antiscam.enabled': false } },
          { upsert: true }
        );
        await client.reply(jid, '❌ Antiscam DISABLED', msg);
        
      } else {
        await client.sendMsg(jid, {
          text: `🛡️ *Antiscam Help*\n\n\`antiscam add <word>\` - Add scam word\n\`antiscam remove <word>\` - Remove word\n\`antiscam list\` - View all words\n\`antiscam on/off\` - Enable/Disable`,
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

    } catch (error) {
      await client.reply(jid, `❌ Error: ${error.message}`, msg);
    }
  }
};

