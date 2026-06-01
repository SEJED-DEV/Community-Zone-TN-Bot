/**
 * prefixManager.js
 * Manages the server-wide tag/prefix on member nicknames.
 * The prefix is stored in settings.json and can be changed via the admin panel.
 * 
 * Format: <TAG> username
 * Example: 𝐂𝐙𝐓⚡ • akaza_senior
 */

const settingsManager = require('./settingsManager');

const DEFAULT_PREFIX = '𝐂𝐙𝐓⚡ • ';
const MAX_NICK_LENGTH = 32;

/**
 * Get the currently configured server tag from settings.
 * Falls back to DEFAULT_PREFIX if not set.
 */
function getPrefix() {
  const settings = settingsManager.loadSettings();
  return settings.hasOwnProperty('serverTag') ? settings.serverTag : DEFAULT_PREFIX;
}

/**
 * Strips leading/trailing emojis and symbols from a nickname.
 */
function cleanTempVoiceEmojis(name) {
  if (!name) return name;
  let cleaned = name.trim();
  
  const leadingEmojiRegex = /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F0FF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\p{Extended_Pictographic}]+/u;
  const trailingEmojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F0FF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\p{Extended_Pictographic}]+$/u;

  cleaned = cleaned.replace(leadingEmojiRegex, '').trim();
  cleaned = cleaned.replace(trailingEmojiRegex, '').trim();
  
  return cleaned;
}

/**
 * Returns true if the nickname already starts with the current prefix.
 * Accounts for temporary voice emojis wrapping the nickname.
 */
function hasPrefix(nickname) {
  if (!nickname) return false;
  
  // Clean off any temporary voice emojis before checking for the server tag
  const cleaned = cleanTempVoiceEmojis(nickname);
  
  const prefix = getPrefix();
  if (!prefix) return false;
  return cleaned.startsWith(prefix);
}

/**
 * Strips the current and all past prefixes from a nickname (returns the base name).
 */
function stripPrefix(nickname) {
  if (!nickname) return nickname;
  
  let cleaned = nickname.trim();
  const prefix = getPrefix();
  
  // 1. Strip the current prefix if present
  if (prefix && cleaned.startsWith(prefix)) {
    cleaned = cleaned.slice(prefix.length).trim();
  }
  
  // 2. Load settings to strip any past prefixes
  const settings = settingsManager.loadSettings();
  const pastTags = settings.pastServerTags || [];
  
  // Ensure the default prefix is also stripped
  if (!pastTags.includes(DEFAULT_PREFIX)) {
    pastTags.push(DEFAULT_PREFIX);
  }

  // Loop multiple times to strip in case there are multiple stacked prefixes
  let strippedAny = true;
  while (strippedAny) {
    strippedAny = false;
    
    // Check current prefix
    if (prefix && cleaned.startsWith(prefix)) {
      cleaned = cleaned.slice(prefix.length).trim();
      strippedAny = true;
    }
    
    // Check past prefixes
    for (const pastTag of pastTags) {
      if (pastTag && cleaned.startsWith(pastTag)) {
        cleaned = cleaned.slice(pastTag.length).trim();
        strippedAny = true;
      }
    }
  }
  
  return cleaned;
}

/**
 * Builds a full prefixed nickname, truncated to Discord's 32-char limit.
 */
function buildPrefixedNick(baseName) {
  const prefix = getPrefix();
  const full = `${prefix}${baseName}`;
  return [...full].slice(0, MAX_NICK_LENGTH).join('');
}

/**
 * Apply the server tag prefix to a member's nickname.
 * - Skips bots and guild owner
 * - Strips existing prefix first to avoid doubling
 * - Respects active temporary voice channel emojis
 */
async function applyPrefix(member) {
  if (!member || member.user.bot) return;
  if (member.id === member.guild.ownerId) return;

  try {
    const currentNick = member.nickname;
    const displayName = member.user.displayName ?? member.user.username;
    
    // Check if the member is in a temporary voice room
    const voiceChannelId = member.voice?.channelId;
    let tempVoiceEmoji = null;
    let isInTempVoice = false;

    if (voiceChannelId) {
      // Dynamic require to avoid circular dependency
      const tempVoiceManager = require('../managers/tempVoice');
      const room = tempVoiceManager.getRoomByVoiceId(voiceChannelId);
      if (room) {
        isInTempVoice = true;
        const voiceChannel = member.guild.channels.cache.get(voiceChannelId);
        if (voiceChannel) {
          const { getChannelEmoji } = require('./nicknameEmojiHelper');
          tempVoiceEmoji = getChannelEmoji(voiceChannel.name) || '🔊';
        }
      }
    }

    // Extract any existing temp voice emojis directly from the nickname if the voice state cache isn't fully ready
    if (!isInTempVoice && currentNick) {
      const leadingEmojiRegex = /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F0FF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\p{Extended_Pictographic}]+/u;
      const trailingEmojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F0FF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\p{Extended_Pictographic}]+$/u;
      
      const leadingMatch = currentNick.trim().match(leadingEmojiRegex);
      const trailingMatch = currentNick.trim().match(trailingEmojiRegex);
      
      if (leadingMatch && trailingMatch) {
        // If they match or both exist, treat as active temp voice session
        isInTempVoice = true;
        tempVoiceEmoji = leadingMatch[0];
      }
    }

    // Strip both current/past prefixes AND temp emojis to get the true base username
    const cleanedNick = currentNick ? cleanTempVoiceEmojis(currentNick) : displayName;
    const base = stripPrefix(cleanedNick);
    
    const prefix = getPrefix();
    // Build the clean prefixed nickname
    const prefixedBase = prefix ? buildPrefixedNick(base) : base;

    // If they are in temp voice, wrap the prefixed nickname in the temp emojis
    let desired;
    if (isInTempVoice && tempVoiceEmoji) {
      desired = `${tempVoiceEmoji} ${prefixedBase} ${tempVoiceEmoji}`;
    } else {
      desired = prefixedBase;
    }

    // Truncate to Discord 32 char limit
    desired = [...desired].slice(0, 32).join('');

    if (member.nickname !== desired) {
      await member.setNickname(desired, 'Server tag enforcement').catch(err => {
        if (!err.message?.includes('Missing Permissions')) {
          console.warn(`[PREFIX] Could not set nickname for ${member.user.tag}: ${err.message}`);
        }
      });
    }
  } catch (err) {
    console.warn(`[PREFIX] Error applying prefix to ${member.user.tag}: ${err.message}`);
  }
}

/**
 * Save a new server tag to settings and keep track of past tags.
 */
function setPrefix(newTag) {
  const settings = settingsManager.loadSettings();
  const currentTag = settings.hasOwnProperty('serverTag') ? settings.serverTag : DEFAULT_PREFIX;
  
  const pastTags = settings.pastServerTags || [];
  if (currentTag && currentTag !== newTag && !pastTags.includes(currentTag)) {
    pastTags.push(currentTag);
  }
  if (DEFAULT_PREFIX && DEFAULT_PREFIX !== newTag && !pastTags.includes(DEFAULT_PREFIX)) {
    pastTags.push(DEFAULT_PREFIX);
  }

  settingsManager.saveSettings({ 
    serverTag: newTag,
    pastServerTags: pastTags
  });
}

module.exports = { getPrefix, hasPrefix, stripPrefix, buildPrefixedNick, applyPrefix, setPrefix, DEFAULT_PREFIX };
