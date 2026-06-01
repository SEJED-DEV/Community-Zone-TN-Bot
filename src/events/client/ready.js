const { ActivityType, ChannelType } = require('discord.js');
const commandHandler = require('../../handlers/command');
const levelingManager = require('../../managers/levelingManager');
const musicEvents = require('../../utils/musicEvents');
const config = require('../../config');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`\x1b[36m
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║    ██████╗ ██████╗ ████████╗    ██████╗ ███╗   ██╗██╗           ║
║   ██╔══██╗██╔══██╗╚══██╔══╝   ██╔═══██╗████╗  ██║██║           ║
║   ██████╔╝██║  ██║   ██║      ██║   ██║██╔██╗ ██║██║           ║
║   ██╔══██╗██║  ██║   ██║      ██║   ██║██║╚██╗██║██║           ║
║   ██████╔╝██████╔╝   ██║      ╚██████╔╝██║ ╚████║███████╗      ║
║   ╚═════╝ ╚═════╝    ╚═╝       ╚═════╝ ╚═╝  ╚═══╝╚══════╝      ║
║                                                                  ║
║         🌐  Community Zone TN — Discord Bot                      ║
║         ⚙️   Dev by sejed.dev & akaza_senior                     ║
║         ✅  Bot is ONLINE and ready to serve!                    ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
\x1b[0m`);
    console.log(`\x1b[32m[CLIENT READY]\x1b[0m Logged in as \x1b[33m${client.user.tag}\x1b[0m (${client.user.id})`);

    // Dynamic presence update representing premium status
    client.user.setPresence({
      activities: [{
        name: 'Developed by sejed.dev & akaza_senior',
        type: ActivityType.Custom,
        state: 'Developed by sejed.dev & akaza_senior',
        emoji: config.emojis.developer
      }],
      status: 'online'
    });

    // Deploy slash commands automatically on startup
    try {
      await commandHandler.registerSlashCommands(client);
    } catch (err) {
      console.error('[READY EVENT] Failed to auto-register slash commands:', err);
    }

    // Start background Voice XP evaluation ticker
    try {
      levelingManager.startVoiceXpTicker(client);
    } catch (err) {
      console.error('[READY EVENT] Failed to start Voice XP ticker:', err);
    }

    // Register music player event listeners (Now Playing embeds, queue end notices)
    try {
      musicEvents.register(client);
    } catch (err) {
      console.error('[READY EVENT] Failed to register music events:', err);
    }

    // Auto-setup of the trigger voice channel "🎧・𝐉𝐨𝐢𝐧 𝐓𝐨 𝐂𝐫𝐞𝐚𝐭𝐞" inside Category
    try {
      const guildId = config.guildId;
      const categoryId = config.tempCategoryId;

      if (guildId && guildId !== 'YOUR_SERVER_GUILD_ID_HERE') {
        const guild = await client.guilds.fetch(guildId).catch(() => null);
        if (guild) {
          if (categoryId && categoryId !== 'YOUR_CATEGORY_ID_HERE') {
            const category = await guild.channels.fetch(categoryId).catch(() => null);
            if (category && category.type === ChannelType.GuildCategory) {
              // Look for the voice channel inside the category parent
              const existingChannel = guild.channels.cache.find(
                ch => ch.type === ChannelType.GuildVoice && ch.parentId === categoryId && ch.name === '🎧・𝐉𝐨𝐢𝐧 𝐓𝐨 𝐂𝐫𝐞𝐚𝐭𝐞'
              );

              if (existingChannel) {
                config.triggerChannelId = existingChannel.id;
                console.log(`[TRIGGER CHANNEL SETUP] Found existing trigger channel: 🎧・𝐉𝐨𝐢𝐧 𝐓𝐨 𝐂𝐫𝐞𝐚𝐭𝐞 (ID: ${existingChannel.id})`);
              } else {
                console.log(`[TRIGGER CHANNEL SETUP] Creating trigger voice channel: 🎧・𝐉𝐨𝐢𝐧 𝐓𝐨 𝐂𝐫𝐞𝐚𝐭𝐞 inside category...`);
                const newTrigger = await guild.channels.create({
                  name: '🎧・𝐉𝐨𝐢𝐧 𝐓𝐨 𝐂𝐫𝐞𝐚𝐭𝐞',
                  type: ChannelType.GuildVoice,
                  parent: categoryId
                });
                config.triggerChannelId = newTrigger.id;
                console.log(`[TRIGGER CHANNEL SETUP] Successfully created trigger voice channel: 🎧・𝐉𝐨𝐢𝐧 𝐓𝐨 𝐂𝐫𝐞𝐚𝐭𝐞 (ID: ${newTrigger.id})`);
              }
            } else {
              console.warn(`[TRIGGER CHANNEL SETUP WARNING] Category ID (${categoryId}) is invalid or not a Category.`);
            }
          }
        } else {
          console.warn(`[TRIGGER CHANNEL SETUP WARNING] Guild (${guildId}) could not be fetched.`);
        }
      }
    } catch (err) {
      console.error('[TRIGGER CHANNEL SETUP ERROR] Failed to automatically setup trigger channel:', err);
    }

    // ── STARTUP & BACKGROUND GARBAGE COLLECTOR ──
    try {
      const guildId = config.guildId;
      const categoryId = config.tempCategoryId;

      if (guildId && guildId !== 'YOUR_SERVER_GUILD_ID_HERE') {
        const guild = await client.guilds.fetch(guildId).catch(() => null);
        if (guild && categoryId && categoryId !== 'YOUR_CATEGORY_ID_HERE') {
          const runCleanup = async () => {
            console.log('[TEMP VOICE GC] Scanning for empty temporary voice channels...');
            const category = await guild.channels.fetch(categoryId).catch(() => null);
            if (category && category.type === ChannelType.GuildCategory) {
              const children = guild.channels.cache.filter(ch => ch.parentId === categoryId && ch.type === ChannelType.GuildVoice);
              for (const [id, ch] of children) {
                if (id !== config.triggerChannelId && ch.name !== '🎧・𝐉𝐨𝐢𝐧 𝐓𝐨 𝐂𝐫𝐞𝐚𝐭𝐞' && ch.members.size === 0) {
                  console.log(`[TEMP VOICE GC] Deleting empty leftover channel: ${ch.name} (${id})`);
                  await ch.delete().catch(() => null);
                }
              }
            }
          };

          // Run immediately on boot
          await runCleanup();
          // Run continuously every 60 seconds
          setInterval(runCleanup, 60000);
        }
      }
    } catch (gcErr) {
      console.error('[TEMP VOICE GC ERROR] Failed during startup cleanup:', gcErr);
    }

    console.log('[SYSTEM ONLINE] Bot is fully configured and running.');
  }
};
