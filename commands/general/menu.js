const fs = require('fs-extra');
const path = require('path');
const config = require('../../config');
const { generateWAMessageFromContent, prepareWAMessageMedia, proto } = require('@whiskeysockets/baileys');

// ========== 🎨 PREMIUM TEXT STYLER ==========
const style = {
  border: (top, mid, bot) => `╭${top}╮\n${mid}╰${bot}╯`,
  header: (title) => `✦ ${title.toUpperCase()} ✦`,
  item: (icon, text) => `  ${icon} ${text}`,
  divider: '━━━ ✦ ✦ ✦ ━━━',
  fancy: (text) => text
    .replace(/\*\*(.*?)\*\*/g, '*$1*')
    .replace(/\*(.*?)\*/g, '*$1*')
    .replace(/__(.*?)__/g, '_$1_')
    .replace(/`(.*?)`/g, '`$1`')
};

// ========== ⏱️ UPTIME CALCULATOR ==========
const formatUptime = (seconds) => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${Math.floor(seconds % 60)}s`);
  return parts.join(' ');
};

// ========== 🔍 SMART USERNAME FETCHER ==========
const getUsername = async (sock, sender, pushname) => {
  let name = pushname?.trim();
  if (!name || name === 'undefined') {
    try {
      const contact = sock.contactStore?.contacts?.[sender];
      name = contact?.name || contact?.pushname || contact?.verifiedName;
    } catch {}
  }
  if (!name && sender.includes('@g.us')) {
    try {
      // Group context handled separately
    } catch {}
  }
  return name?.trim() || `Member_${sender.split('@')[0].slice(-4)}`;
};

module.exports = {
  name: 'menu',
  aliases: ['help', 'commands', 'cmd', 'h', 'start'],
  category: 'general',
  description: 'Premium sliding carousel menu with all bot commands',
  ownerOnly: false,
  
  execute: async (client, msg, args, { from, sender, pushname }) => {
    try {
      // ========== 🎯 USER & CONTEXT ==========
      const userName = await getUsername(client.sock, sender, pushname);
      const userNumber = sender.split('@')[0];
      const isGroup = from.endsWith('@g.us');
      const mentions = [sender];

      // ========== 📱 CLIENT DETECTION ==========
      const msgText = msg?.message?.conversation || msg?.message?.extendedTextMessage?.text || '';
      const isLegacy = msgText.length < 3;
      const maxButtons = isLegacy ? 3 : 6;

      // ========== 🗂️ COMMAND SCANNER ==========
      const cmdDir = path.join(__dirname, '../../commands');
      const categories = fs.readdirSync(cmdDir)
        .filter(d => fs.statSync(path.join(cmdDir, d)).isDirectory())
        .sort();

      // ========== 🧭 NAVIGATION HANDLER ==========
      let activeCat = null, activePage = 0;
      if (args[0] === 'slide' && args[1]) {
        activeCat = args[1];
        activePage = parseInt(args[2]) || 0;
      }

      // ========== 🖼️ IMAGE PREPARATION ==========
      let mediaContent = null;
      if (config.botImage && !isLegacy) {
        try {
          mediaContent = await prepareWAMessageMedia(
            { image: { url: config.botImage } },
            { upload: client.sock.waUploadToServer }
          );
        } catch (e) {
          console.warn('Image prep failed:', e.message);
        }
      }

      // ========== 🎨 BUTTON FACTORY ==========
      const makeBtn = (label, cmdId, icon = '▸') => ({
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
          display_text: `${icon} ${label}`,
          id: `${config.prefix}${cmdId.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')}`
        })
      });

      const makeNav = (label, cat, page, icon) => ({
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
          display_text: `${icon} ${label}`,
          id: `${config.prefix}menu slide ${cat} ${page}`
        })
      });

      // ========== 🔄 CAROUSEL BUILDER ==========
      const cards = [];
      const cmdIcons = ['⚡','🎯','🔧','✨','🚀','💎','🔥','🌟','📊','🛡️','🎨','⚙️'];

      for (const category of categories) {
        const catPath = path.join(cmdDir, category);
        let commands = fs.readdirSync(catPath)
          .filter(f => f.endsWith('.js') && f !== 'index.js')
          .map(f => f.replace('.js', ''))
          .sort();

        if (!commands.length) continue;

        // Pagination
        const perPage = commands.length <= 3 ? 3 : maxButtons;
        const pages = [];
        for (let i = 0; i < commands.length; i += perPage) {
          pages.push(commands.slice(i, i + perPage));
        }

        const startPage = (activeCat === category) ? activePage : 0;

        pages.forEach((pageCmds, pageIndex) => {
          if (activeCat && activeCat !== category) return;
          if (activeCat && pageIndex !== startPage) return;

          // Command buttons with rotating icons
          const buttons = pageCmds.map((cmd, idx) => 
            makeBtn(cmd, cmd, cmdIcons[idx % cmdIcons.length])
          );

          // Navigation
          if (pages.length > 1) {
            if (pageIndex > 0) buttons.push(makeNav('Back', category, pageIndex - 1, '◀'));
            if (pageIndex < pages.length - 1) buttons.push(makeNav('Next', category, pageIndex + 1, '▶'));
            buttons.push(makeNav('Home', 'home', 0, '🏠'));
          }

          // Category selector
          if (!activeCat && categories.length > 1) {
            categories.filter(c => c !== category).slice(0, 2).forEach(c => {
              buttons.push(makeNav(c, c, 0, '📁'));
            });
          }

          // Card styling
          const catDisplay = category.replace('-', ' ').toUpperCase();
          const pageLabel = pages.length > 1 ? `Page ${pageIndex + 1}/${pages.length}` : '';
          
          const bodyText = `╭${style.divider}╮\n` +
            `   ${style.header(catDisplay)} ${pageLabel}\n` +
            `╰${style.divider}╯\n\n` +
            `👤 ${userName} @${userNumber.slice(-4)}\n` +
            `📌 Choose a command:\n\n`;

          const card = {
            body: { text: style.fancy(bodyText) },
            footer: { text: style.fancy(`${style.divider}\n👑 ${config.developer} • v${config.version}`) },
            header: mediaContent ? {
              hasMediaAttachment: true,
              imageMessage: mediaContent.imageMessage
            } : {
              hasMediaAttachment: false,
              title: style.fancy(`🤖 ${config.botName}`)
            },
            nativeFlowMessage: { buttons, messageVersion: 1 }
          };
          cards.push(card);
        });
      }

      // ========== 🎪 MAIN DASHBOARD ==========
      const totalCmds = cards.reduce((sum, c) => sum + (c.nativeFlowMessage?.buttons?.length || 0), 0);
      
      const dashboard = `╭${style.divider}╮\n` +
        `   ${style.header(config.botName)}\n` +
        `   👁 PREMIUM • v${config.version}\n` +
        `╰${style.divider}╯\n\n` +
        `⚡ ${totalCmds}+ Commands\n` +
        `📂 ${categories.length} Categories\n` +
        `⏱️ Uptime: ${formatUptime(process.uptime())}\n` +
        `🌐 Mode: ${config.mode.toUpperCase()}\n\n` +
        `💡 Tip: Type any command without prefix!\n` +
        `📢 Channel: ${config.channelJid}`;

      // ========== 📲 SEND CAROUSEL ==========
      const interactiveMsg = {
        body: { text: style.fancy(dashboard) },
        footer: { text: style.fancy(`${style.divider}\n🔄 Slide ← → to explore • ${config.prefix}help for guide`) },
        header: {
          title: style.fancy(`✨ ${config.botName}`),
          hasMediaAttachment: false,
          subtitle: style.fancy('Free WhatsApp Automation')
        },
        carouselMessage: {
          cards,
          messageVersion: 1
        }
      };

      const waMsg = generateWAMessageFromContent(from, { interactiveMessage: interactiveMsg }, {
        userJid: client.sock.user?.id,
        upload: client.sock.waUploadToServer
      });

      await client.sock.relayMessage(from, waMsg.message, {
        messageId: waMsg.key.id,
        mentions,
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: config.channelJid,
            serverMessageId: -1
          }
        }
      });

      // Log to channel
      await client.sendMsg(config.channelJid, {
        text: `📊 Menu viewed by @${userNumber}\n📍 ${isGroup ? 'Group' : 'Private'}\n📱 Commands: ${totalCmds}`,
        mentions: [sender]
      });

    } catch (err) {
      console.error('Menu error:', err);
      
      // ========== 🆘 TEXT FALLBACK ==========
      const userName = pushname || `User_${sender.split('@')[0].slice(-4)}`;
      
      let text = `╭${style.divider}╮\n` +
        `   ${style.header(config.botName)} MENU\n` +
        `   v${config.version} • PREMIUM\n` +
        `╰${style.divider}╯\n\n` +
        `👤 ${userName}\n` +
        `⏱️ ${formatUptime(process.uptime())}\n\n`;

      for (const cat of categories) {
        const catPath = path.join(cmdDir, cat);
        const cmds = fs.readdirSync(catPath)
          .filter(f => f.endsWith('.js'))
          .map(f => f.replace('.js', ''));
        
        if (cmds.length) {
          text += `✦ ${cat.replace('-', ' ').toUpperCase()}\n`;
          cmds.forEach(cmd => text += `  ◦ \`${config.prefix}${cmd}\`\n`);
          text += '\n';
        }
      }

      text += `${style.divider}\n` +
        `👑 ${config.developer}\n` +
        `💡 No prefix needed!\n` +
        `📢 ${config.channelJid}`;

      await client.sock.sendMessage(from, {
        text: style.fancy(text),
        mentions: [sender],
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: config.channelJid,
            serverMessageId: -1
          },
          externalAdReply: {
            title: config.botName,
            body: `v${config.version}`,
            thumbnailUrl: config.botImage,
            sourceUrl: config.websiteUrl,
            mediaType: 1
          }
        }
      }, { quoted: msg });
    }
  }
};

