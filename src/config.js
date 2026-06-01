require('dotenv').config();
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const settingsPath = path.join(dataDir, 'settings.json');
let savedSettings = {};
if (fs.existsSync(settingsPath)) {
  try {
    savedSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch (e) {
    console.error('Failed to parse settings.json:', e);
  }
}

module.exports = {
  // Bot authentication and identity
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,

  // Channel and category settings (Load from settings.json if exists, else fallback to .env)
  triggerChannelId: savedSettings.triggerChannelId || process.env.TRIGGER_CHANNEL_ID,
  tempCategoryId: savedSettings.tempCategoryId || process.env.TEMP_CATEGORY_ID,
  logChannelId: savedSettings.logChannelId || process.env.LOG_CHANNEL_ID,
  leaveChannelId: savedSettings.leaveChannelId || process.env.LEAVE_CHANNEL_ID || null,
  banAnnouncementChannelId: savedSettings.banAnnouncementChannelId || process.env.BAN_ANNOUNCEMENT_CHANNEL_ID || null,
  kickChannelId: savedSettings.kickChannelId || null,
  timeoutChannelId: savedSettings.timeoutChannelId || null,
  warnChannelId: savedSettings.warnChannelId || null,
  levelUpChannelId: savedSettings.levelUpChannelId || (process.env.LEVEL_UP_CHANNEL_ID && process.env.LEVEL_UP_CHANNEL_ID !== 'YOUR_LEVEL_UP_CHANNEL_ID_HERE' ? process.env.LEVEL_UP_CHANNEL_ID : null),
  levelingEnabled: savedSettings.levelingEnabled !== false,
  nicknamePanelChannelId: savedSettings.nicknamePanelChannelId || null,
  gameRolePanelChannelId: savedSettings.gameRolePanelChannelId || null,
  mrWhiteStatsChannelId: savedSettings.mrWhiteStatsChannelId || null,
  trackerLogChannelId: savedSettings.trackerLogChannelId || null,

  // Premium visual customisation (Glassmorphic & Vibrant Palettes)
  colors: {
    success: 0x10B981,   // Emerald Green HSL
    danger: 0xEF4444,    // Crimson Red
    info: 0x6366F1,      // Deep Indigo
    warning: 0xF59E0B,   // Sunset Amber
    accent: 0x8B5CF6,    // Neon Purple
    logging: {
      messageDelete: 0xEF4444, // Crimson Red
      messageUpdate: 0xF59E0B, // Sunset Amber
      memberJoin: 0x10B981,    // Emerald Green
      memberLeave: 0x6B7280,   // Cool Gray
      voice: 0x3B82F6,         // Bright Blue
      roles: 0x8B5CF6,         // Purple
      moderation: 0xDC2626,   // Dark Red
      channel: 0xEC4899        // Rose Pink
    }
  },

  // Emojis for elegant UI (Discord button API safe - no ZWJ or excessive variation selectors)
  emojis: require('./emojis'),

  // Default values
  defaults: {
    voiceChannelName: '🔊 Room - {username}',
    textChannelName: '💬-room-{username}',
    maxLimit: 99
  }
};
