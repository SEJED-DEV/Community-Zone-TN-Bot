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
  warnChannelId: savedSettings.warnChannelId || '1510778134205829120',

  // Advanced Logging Channels
  logChannels: {
    roleCreated: '1509047421446000670',
    roleDeleted: '1509047553977483304',
    roleGiven: '1509047834891260055',
    roleUpdated: '1509048058682277918',
    roleRemoved: '1509048778785558568',
    channelCreated: '1509047352193847326',
    channelUpdated: '1509047931398000721',
    channelDeleted: '1509047456099336214',
    channelPermissionsUpdated: '1509048021990506637',
    messageEdited: '1509047592108167331',
    messageDeleted: '1509047522293977149',
    threadCreated: '1509047389850177596',
    threadDeleted: '1509047491830485103',
    threadUpdated: '1509047986775396383',
    nicknameChanged: '1509047758131171439',
    timeoutGivenRemoved: '1509047303074484244',
    moderationCommandUsed: '1509047798769651843',
    voiceStateMuteDeafen: '1509048197740363848',
    serversInvites: '1509048581615652914',
    memberBanned: '1509047244933042337',
    memberUnbanned: '1509047889945432124',
    memberKicked: '1509047624672608306',
    memberJoined: '1509047673662083113',
    memberLeft: '1509047715755983038',
    memberJoinedVoiceChannel: '1509048110121488544',
    memberLeftVoiceChannel: '1509048149358940230',
    memberSwitchedVoice: '1509048231932203049',
    inviteLogger: '1509043266438561902'
  },

  // Verification System Configuration
  verification: {
    triggerChannels: savedSettings.verifyTriggerChannels || [], // IDs of voice channels x, y, z
    logChannel: '1509043266438561902', // Channel N
    staffRole: savedSettings.verifyStaffRole || null,
    maleRole: savedSettings.verifyMaleRole || null,
    femaleRole: savedSettings.verifyFemaleRole || null
  },

  levelUpChannelId: savedSettings.levelUpChannelId || (process.env.LEVEL_UP_CHANNEL_ID && process.env.LEVEL_UP_CHANNEL_ID !== 'YOUR_LEVEL_UP_CHANNEL_ID_HERE' ? process.env.LEVEL_UP_CHANNEL_ID : null),
  levelingEnabled: savedSettings.levelingEnabled !== false,
  nicknamePanelChannelId: savedSettings.nicknamePanelChannelId || null,
  gameRolePanelChannelId: savedSettings.gameRolePanelChannelId || null,
  mrWhiteStatsChannelId: savedSettings.mrWhiteStatsChannelId || null,
  trackerLogChannelId: savedSettings.trackerLogChannelId || null,
  confessChannelId: savedSettings.confessChannelId || null,
  confessLogChannelId: '1511242621505372301',

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
