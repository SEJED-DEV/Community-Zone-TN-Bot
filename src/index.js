// ── Load Discord client and handlers ─────────────────────────────────────────
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const config = require('./config');
const eventHandler = require('./handlers/event');
const commandHandler = require('./handlers/command');
const musicManager = require('./managers/musicManager');
const musicEvents = require('./utils/musicEvents');
const apiManager = require('./managers/apiManager');

// Check token
if (!config.token || config.token === 'YOUR_BOT_TOKEN_HERE') {
  console.error('[CRITICAL ERROR] DISCORD_TOKEN is missing in the .env file!');
  process.exit(1);
}

// Initialize Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.GuildMember,
    Partials.User
  ]
});

// ── Initialize Lavalink music system with the client ─────────────────────────
// Kazagumo needs the client to hook into raw websocket events BEFORE login
musicManager.init(client);

// Load command/event handlers
commandHandler.loadCommands(client);
eventHandler(client);

// ── Music Button Interaction Handler ─────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const { customId, member } = interaction;
  const musicButtonIds = ['music_pause_resume', 'music_skip', 'music_stop', 'music_queue'];
  if (!musicButtonIds.includes(customId)) return;

  const voiceChannel = member?.voice?.channel;

  if (!voiceChannel) {
    return interaction.reply({ content: '❌ You must join a voice channel first.', ephemeral: true });
  }

  // Player is keyed by voiceChannelId (multi-room support)
  const player = musicManager.getPlayer(voiceChannel.id);

  if (!player) {
    return interaction.reply({ content: '❌ No music is currently playing in your voice channel.', ephemeral: true });
  }

  try {
    if (customId === 'music_pause_resume') {
      await player.pause(!player.paused);
      await interaction.reply({
        content: player.paused ? '⏸️ Music paused.' : '▶️ Music resumed.',
        ephemeral: true
      });

    } else if (customId === 'music_skip') {
      await player.skip();
      await interaction.reply({ content: '⏭️ Skipped!', ephemeral: true });

    } else if (customId === 'music_stop') {
      musicManager.destroyPlayer(voiceChannel.id);
      await interaction.reply({ content: '⏹️ Stopped and disconnected.', ephemeral: true });

    } else if (customId === 'music_queue') {
      const current = player.queue.current;
      const upcoming = player.queue.tracks || [];
      const lines = upcoming.slice(0, 10).map((t, i) => `\`${i + 1}.\` ${t.title}`).join('\n') || '*(empty)*';
      await interaction.reply({
        content: `**Now Playing:** ${current?.title || 'Nothing'}\n\n**Up Next:**\n${lines}`,
        ephemeral: true
      });
    }
  } catch (err) {
    console.error('[BUTTON INTERACTION ERROR]', err);
    if (!interaction.replied) {
      await interaction.reply({ content: '❌ An error occurred.', ephemeral: true });
    }
  }
});

// ── Register music event listeners AFTER client ready ────────────────────────
client.once('clientReady', () => {
  musicEvents.register(client);
  apiManager.init(client);
  console.log('[SYSTEM ONLINE] Bot is fully configured and running.');
});

// Anti-crash
process.on('unhandledRejection', (reason, promise) => {
  console.error('[ANTI-CRASH] Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err, origin) => {
  console.error('[ANTI-CRASH] Uncaught Exception:', err, 'origin:', origin);
});
process.on('uncaughtExceptionMonitor', (err, origin) => {
  console.error('[ANTI-CRASH MONITOR] Uncaught Exception Monitor:', err, 'origin:', origin);
});

// Login
client.login(config.token).catch(err => {
  console.error('[BOT LOGIN ERROR] Failed to login to Discord:', err);
  process.exit(1);
});
