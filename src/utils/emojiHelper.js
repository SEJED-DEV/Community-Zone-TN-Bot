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
  server: '🏠',
  confess_love: '❤️',
  confess_sad: '😢',
  confess_haha: '😂',
  confess_angry: '😡',
  confess_wow: '😮',
  confess_comment: '💬',
  purge: '🧹',
  dispute: '⚖️',
  crate: '📦',
  rock: '🪨',
  paper: '📄',
  scissors: '✂️',
  vote: '🗳️'
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

  // Strict fallback logic: only use fallback if emojiStr is missing or placeholder
  const isPlaceholder = emojiStr && emojiStr.includes('123456789012345678');

  if (!emojiStr || isPlaceholder) {
    return FALLBACKS[key] || '❓';
  }

  // Match <a:name:id> or <:name:id>
  const match = emojiStr.match(/<a?:([a-zA-Z0-9_]+):([0-9]+)>/);
  if (match) {
    const id = match[2];
    // If forButton is true, we MUST return just the ID for custom emojis in ButtonBuilder.setEmoji
    return forButton ? id : emojiStr;
  }

  // Not a custom emoji format, return as is
  return emojiStr || FALLBACKS[key] || '❓';
}

module.exports = {
  getSafeEmoji,
  FALLBACKS
};
