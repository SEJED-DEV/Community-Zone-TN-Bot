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
 * @param {string} key - The key in src/emojis.js
 * @param {Client} [client] - The Discord client to check cache
 * @param {boolean} [forButton=true] - If true, returns ID for custom emojis (required for buttons)
 */
function getSafeEmoji(key, client, forButton = true) {
  const emojiStr = config.emojis[key];
  if (!emojiStr) return FALLBACKS[key] || '❓';

  // Match <a:name:id> or <:name:id>
  const match = emojiStr.match(/<a?:([a-zA-Z0-9_]+):([0-9]+)>/);
  if (match) {
    const id = match[2];
    // If client is provided, verify it exists in cache
    if (client && client.emojis && client.emojis.cache.has(id)) {
      return forButton ? id : emojiStr;
    }
    // If we're strictly using placeholders and they are invalid IDs,
    // Discord API will throw. So we check if the ID is real.
    // If it's the placeholder ID '123456789012345678', we definitely fallback.
    if (id === '123456789012345678') {
      return FALLBACKS[key] || '❓';
    }

    // If no client to check, we assume it's valid unless it's the placeholder
    return forButton ? id : emojiStr;
  }

  // Not a custom emoji format, return as is (Unicode or text)
  return emojiStr || FALLBACKS[key] || '❓';
}

module.exports = {
  getSafeEmoji,
  FALLBACKS
};
