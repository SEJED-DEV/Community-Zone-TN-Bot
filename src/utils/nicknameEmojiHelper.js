/**
 * nicknameEmojiHelper.js
 * Manages random emoji prefixing for temporary voice channels.
 * Uses a persistent JSON store to save original nicknames before modification,
 * and includes a regex-based fallback to clean stuck emojis dynamically.
 */

const fs = require('fs');
const path = require('path');

// ── Persistent Store: userId → original nickname (null = no custom nickname) ──
const originalNicknames = new Map();

const DATA_DIR = path.join(__dirname, '../../data');
const FILE_PATH = path.join(DATA_DIR, 'temp_nicknames.json');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load from file on startup
function loadNicknames() {
  try {
    if (fs.existsSync(FILE_PATH)) {
      const data = fs.readFileSync(FILE_PATH, 'utf8');
      const parsed = JSON.parse(data);
      for (const [key, val] of Object.entries(parsed)) {
        originalNicknames.set(key, val);
      }
      console.log(`[EMOJI NICK] Loaded ${originalNicknames.size} original nicknames from persistent storage.`);
    }
  } catch (err) {
    console.error('[EMOJI NICK] Failed to load nicknames:', err);
  }
}

function saveNicknames() {
  try {
    const obj = {};
    for (const [key, val] of originalNicknames.entries()) {
      obj[key] = val;
    }
    fs.writeFileSync(FILE_PATH, JSON.stringify(obj, null, 2), 'utf8');
  } catch (err) {
    console.error('[EMOJI NICK] Failed to save nicknames:', err);
  }
}

// Run load on startup
loadNicknames();

const RANDOM_EMOJIS = [
  '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚',
  '😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','😣',
  '😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔',
  '🫡','🤭','🫢','🤫','🤥','😶','🫠','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪',
  '😵','🤯','🤠','😈','👿','👹','👺','💀','👻','👽','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿',
  '😾','❤️','🧡','💛','💚','💙','💜','🤎','🖤','🤍','💔','💕','💞','💓','💗','💖','💘','💝','💯','🔥',
  '✨','⚡','💥','🌟','⭐','🌠','🎉','🎊','🎈','🎁','🎀','🏆','🥇','🥈','🥉','🎮','🕹️','🎧','🎤','🎵',
  '🎶','📀','💿','🎬','📺','📻','💻','🖥️','📱','🔋','💡','🔦','🕯️','🛠️','⚙️','🔧','🔨','🧲','💰','💵',
  '💸','💳','💎','👑','🔑','🗝️','🚪','🪄','🧸','🎨','🖌️','✏️','📝','📚','📖','📌','📍','🔒','🔓',
  '💋','🫶','👏','🙌','👍','👎','✊','👊','✌️','🤞','🤟','🤘','👌','👈','👉','👆','👇','✋','👋','💪',
  '🦾','👀','👁️','👅','👄','🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵',
  '🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐞','🦋','🐢','🐍','🦎','🐙','🦑',
  '🦀','🐠','🐟','🐬','🐳','🦈','🐊','🦓','🐘','🦒','🦘','🐪','🐫','🦙','🐐','🐑','🐄','🐎','🐕','🐈',
  '🦚','🦜','🦢','🕊️','🌵','🌲','🌳','🌴','🌱','🌿','☘️','🍀','🍁','🍂','🍄','🌾','💐','🌷','🌹','🥀',
  '🌺','🌸','🌼','🌻','🌞','🌍','🌎','🌏','🌙','🌈','☁️','❄️','☃️','⛄','🌪️','🌊','💧','☔','🍎','🍊',
  '🍋','🍌','🍉','🍇','🍓','🫐','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🥑','🥦','🥬','🌽','🥕','🧄','🧅',
  '🥔','🍠','🥐','🍞','🥖','🧀','🍖','🍗','🥩','🍔','🍟','🍕','🌭','🥪','🌮','🌯','🥙','🍝','🍜','🍲',
  '🍛','🍣','🍱','🥟','🍤','🍙','🍚','🍘','🍥','🥠','🍢','🍡','🍧','🍨','🍦','🎂','🍰','🧁','🍩','🍪',
  '🍫','🍬','🍭','🍮','🍯','🍼','☕','🍵','🧃','🥤','🧋','🍺','🍻','🍷','🍸','🍹','🧉','🍾','⚽','🏀',
  '🏈','⚾','🎾','🏐','🏉','🎱','🏓','🏸','🏒','🏑','🥍','🏏','⛳','🏹','🎣','🤿','🥊','🥋','🎽','🛹',
  '🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤸','⛹️','🤾','🏌️','🧘','🏊','🚴','🚗','🚕','🚙','🚌',
  '🚎','🏎️','🚓','🎟️','🚓','🚑','🚒','🚐','🚚','🚛','🚜','🛵','✈️','🛩️','🚀','🛸','🚁','⛵','🚤','🚢','🚂','🚆',
  '🚇','🚉','🗽','🗼','🏰','🏯','🏝️','🏖️','🏜️','🏕️','⛺','🗻','🏔️','🌋','🕌','⛪','🛕','🕍','🕋',
  '🎡','🎢','🎠','🎪','🎭','🎹','🥁','🎷','🎺','🎸','🎻','🎲','♟️','🎯','🎳','🎮','🧩','🃏','🀄','🛑',
  '🚫','⚠️','❌','⭕','✅','✔️','☑️','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟥','🟧','🟨','🟩','🟦',
  '🟪','⬛','⬜','🔺','🔻','💠','🔘','🔳','🔲','🔔','🔕','📢','📣','💤','💢','💬','🗨️','🗯️','💭','♻️',
  '🔱','📛','🔰','🔆','🔅','⚜️','🔮','🧿','🪬','🕹️','🎰','⚰️','🪦','🧬','🧪','🌡️','💉','🩹','🩺',
  '🚽','🛁','🧼','🪥','🧴','🧻','🧽','🧹','🧺','🪣','🧯','🛒','🎁'
];

/**
 * Extract the leading emoji from a channel name using regex.
 */
function getChannelEmoji(channelName) {
  if (!channelName) return null;
  const trimmed = channelName.trim();
  const match = trimmed.match(/^(\p{Extended_Pictographic}(\u200D\p{Extended_Pictographic}|\uFE0F|\u20E3|\p{Emoji_Modifier})*)/u);
  return match ? match[0] : null;
}

/**
 * Get a random emoji from the list.
 */
function getRandomEmoji() {
  return RANDOM_EMOJIS[Math.floor(Math.random() * RANDOM_EMOJIS.length)];
}

/**
 * Save the member's current nickname to memory and file.
 */
function saveOriginalNickname(member) {
  if (!originalNicknames.has(member.id)) {
    originalNicknames.set(member.id, member.nickname ?? null);
    saveNicknames();
    console.log(`[EMOJI NICK] Saved original nickname for ${member.user.tag}: "${member.nickname ?? 'none'}"`);
  }
}

/**
 * Clean up leading/trailing emojis and spaces from a nickname as a fallback.
 */
function cleanNickname(name) {
  if (!name) return name;
  let cleaned = name.trim();
  
  // Unicode block regexes matching emojis, pictographs, symbols
  const leadingEmojiRegex = /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F0FF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\p{Extended_Pictographic}]+/u;
  const trailingEmojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F0FF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\p{Extended_Pictographic}]+$/u;

  cleaned = cleaned.replace(leadingEmojiRegex, '').trim();
  cleaned = cleaned.replace(trailingEmojiRegex, '').trim();
  
  return cleaned;
}

/**
 * Apply emoji prefix and suffix.
 * Works together with the prefixManager to ensure the server tag is applied underneath temp voice emojis.
 */
async function applyUserNicknameEmoji(member, emoji) {
  if (!member || member.user.bot) return;
  if (member.id === member.guild.ownerId) return;

  try {
    saveOriginalNickname(member);

    const originalNick = originalNicknames.get(member.id);
    let baseName = (originalNick !== null && originalNick !== undefined)
      ? originalNick
      : (member.user.displayName ?? member.user.username);

    // Clean off any temporary voice emojis that might have gotten stuck in the base name
    baseName = cleanNickname(baseName);

    // Dynamically load prefixManager to apply the current server tag prefix
    const prefixManager = require('./prefixManager');
    const currentPrefix = prefixManager.getPrefix();
    
    // Strip any old/current prefixes from baseName to avoid double tags
    const cleanBase = prefixManager.stripPrefix(baseName);
    
    // Apply current prefix if enabled
    const desiredBase = currentPrefix ? prefixManager.buildPrefixedNick(cleanBase) : cleanBase;

    const newNick = `${emoji} ${desiredBase} ${emoji}`;
    const truncated = [...newNick].slice(0, 32).join('');

    if (member.nickname !== truncated) {
      await member.setNickname(truncated, 'Temp Voice: emoji sync').catch(err => {
        console.warn(`[EMOJI NICK] Failed to set nickname for ${member.user.tag}: ${err.message}`);
      });
    }
  } catch (err) {
    console.warn(`[EMOJI NICK] Error applying nickname: ${err.message}`);
  }
}

/**
 * Restore the member's original nickname.
 */
async function restoreOriginalNickname(member) {
  if (!member || member.user.bot) return;
  if (member.id === member.guild.ownerId) return;

  try {
    let originalNick = undefined;
    let found = false;

    if (originalNicknames.has(member.id)) {
      originalNick = originalNicknames.get(member.id);
      originalNicknames.delete(member.id);
      saveNicknames();
      found = true;
    }

    // Failsafe: if not in database but nickname has emojis, strip them dynamically
    if (!found && member.nickname) {
      const cleaned = cleanNickname(member.nickname);
      if (cleaned !== member.nickname) {
        originalNick = cleaned === '' ? null : cleaned;
        found = true;
        console.log(`[EMOJI NICK] Failsafe clean for ${member.user.tag}: "${member.nickname}" -> "${cleaned}"`);
      }
    }

    if (found && member.nickname !== originalNick) {
      await member.setNickname(originalNick, 'Temp Voice: restore nickname').catch(err => {
        console.warn(`[EMOJI NICK] Failed to restore nickname for ${member.user.tag}: ${err.message}`);
      });
      console.log(`[EMOJI NICK] Restored nickname for ${member.user.tag}: "${originalNick ?? 'none'}"`);
    }
  } catch (err) {
    console.warn(`[EMOJI NICK] Restore error: ${err.message}`);
  }
}

module.exports = {
  RANDOM_EMOJIS,
  getChannelEmoji,
  getRandomEmoji,
  applyUserNicknameEmoji,
  restoreOriginalNickname
};
