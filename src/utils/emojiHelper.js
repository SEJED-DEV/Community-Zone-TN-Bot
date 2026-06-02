const config = require('../config');

const FALLBACKS = {
  rename: '📝',
  limit: '👥',
  lock: '🔒',
  unlock: '🔓',
  hide: '👁️',
  show: '👀',
  owner: '👑',
  kick: '🦶',
  allow: '✅',
  deny: '❌',
  mute: '🎙️',
  deafen: '🔕',
  access: '🚪',
  transfer: '👑',
  info: 'ℹ️',
  loading: '⏳',
  success: '✅',
  error: '❌',
  warning: '⚠️',
  dot: '•',
  arrow: '➡️',
  arrow_left: '⬅️',
  music_play: '▶️',
  music_pause: '⏸️',
  music_skip: '⏭️',
  music_stop: '⏹️',
  music_queue: '📋',
  rank: '🏅',
  xp: '✨',
  level: '🎯',
  leaderboard: '🏆',
  balance: '💰',
  wallet: '🪪',
  shop: '🛒',
  casino: '🎰',
  credit: '🟢',
  debit: '🔴',
  online: '🟢',
  developer: '👨‍💻',
  member: '👤',
  server: '🏠'
};

/**
 * Safely resolves an emoji for use in buttons or embeds.
 * If the custom emoji ID from config is invalid/not found, it returns a fallback Unicode emoji.
 * It also supports automatic lookup by name from a specific emoji server.
 * @param {string} key - The key in src/emojis.js
 * @param {Client} [client] - The Discord client to check cache
 * @param {boolean} [forButton=true] - If true, returns ID for custom emojis (required for buttons)
 */
function getSafeEmoji(key, client, forButton = true) {
  let emojiStr = config.emojis[key];
  const EMOJI_GUILD_ID = '1487212215336571043';

  // Helper for automatic lookup
  const autoLookup = () => {
    if (!client) return null;
    const guild = client.guilds.cache.get(EMOJI_GUILD_ID);
    if (!guild) return null;

    // Find by name matching the key
    const emoji = guild.emojis.cache.find(e => e.name === key);
    return emoji || null;
  };

  if (!emojiStr) {
    const found = autoLookup();
    if (found) {
      return forButton ? found.id : found.toString();
    }
    return FALLBACKS[key] || '❓';
  }

  // Match <a:name:id> or <:name:id>
  const match = emojiStr.match(/<a?:([a-zA-Z0-9_]+):([0-9]+)>/);
  if (match) {
    const id = match[2];

    // Placeholder ID check - try auto lookup first
    if (id === '123456789012345678') {
      const found = autoLookup();
      if (found) {
        return forButton ? found.id : found.toString();
      }
      return FALLBACKS[key] || '❓';
    }

    // If client is provided, verify it exists in cache
    if (client && client.emojis && client.emojis.cache) {
      if (!client.emojis.cache.has(id)) {
        // ID not in cache, but maybe we can find it by name in the emoji guild?
        const found = autoLookup();
        if (found) {
          return forButton ? found.id : found.toString();
        }
        return FALLBACKS[key] || '❓';
      }
    }

    return forButton ? id : emojiStr;
  }

  // Not a custom emoji format, return as is
  return emojiStr || '❓';
}

module.exports = {
  getSafeEmoji,
  FALLBACKS
};
