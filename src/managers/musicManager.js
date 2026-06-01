/**
 * musicManager.js — Multi-Room Lavalink Music Manager
 *
 * Each voice channel gets its own independent player and queue.
 * Multiple rooms can play different music simultaneously.
 * Players are keyed by voiceChannelId for per-room isolation.
 */

const { Kazagumo } = require('kazagumo');
const { Connectors } = require('shoukaku');

// ─────────────────────────────────────────────────────────────────────────────
// FREE PUBLIC LAVALINK NODES
// ─────────────────────────────────────────────────────────────────────────────
const LAVALINK_NODES = [
  {
    name: 'Node-1',
    url: 'lavalink.jirayu.net:13592',
    auth: 'youshallnotpass',
    secure: false
  }
];

let kazagumo = null;

// Map: voiceChannelId → player
const voicePlayers = new Map();

/**
 * Initialize Kazagumo with the Discord client.
 * Must be called ONCE from the ready event with the logged-in client.
 */
function init(client) {
  kazagumo = new Kazagumo(
    {
      defaultSearchEngine: 'youtube',
      send: (guildId, payload) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(payload);
      }
    },
    new Connectors.DiscordJS(client),
    LAVALINK_NODES
  );

  // ── Player Events ──────────────────────────────────────────────────────────

  kazagumo.on('playerStart', (player, track) => {
    const voiceId = player.voiceId;
    console.log(`[MUSIC] ▶️  Now playing: "${track.title}" in voice channel ${voiceId}`);
  });

  kazagumo.on('playerEnd', (player) => {
    // Kazagumo handles queue advancement automatically
  });

  kazagumo.on('playerEmpty', (player) => {
    const voiceId = player.voiceId;
    console.log(`[MUSIC] Queue empty in voice channel ${voiceId}. Starting idle timer (3 min)...`);
    // Auto-disconnect after 3 minutes of inactivity
    setTimeout(() => {
      const p = voicePlayers.get(voiceId);
      if (p && p.queue.isEmpty && !p.playing) {
        p.destroy();
        voicePlayers.delete(voiceId);
        console.log(`[MUSIC] Auto-disconnected from voice channel ${voiceId} (idle timeout).`);
      }
    }, 180_000);
  });

  kazagumo.on('playerError', (player, track, error) => {
    console.error(`[MUSIC ERROR] "${track?.title}" in voice ${player.voiceId}:`, error?.message || error);
  });

  kazagumo.on('playerClosed', (player) => {
    const voiceId = player.voiceId;
    voicePlayers.delete(voiceId);
    console.log(`[MUSIC] Player closed and removed for voice channel ${voiceId}.`);
  });

  kazagumo.on('playerDestroy', (player) => {
    voicePlayers.delete(player.voiceId);
  });

  // ── Node Events ────────────────────────────────────────────────────────────

  kazagumo.shoukaku.on('ready', (name) => {
    console.log(`[LAVALINK NODE] ✅ Connected: ${name}`);
  });

  kazagumo.shoukaku.on('error', (name, error) => {
    console.error(`[LAVALINK NODE ERROR] ${name}:`, error.message);
  });

  kazagumo.shoukaku.on('disconnect', (name) => {
    console.warn(`[LAVALINK NODE] Disconnected: ${name}. Auto-reconnecting...`);
  });

  console.log('[MUSIC MANAGER] Multi-room music system initialized. Each voice channel has its own player.');
  return kazagumo;
}

/**
 * Get the Kazagumo instance.
 */
function getKazagumo() {
  return kazagumo;
}

/**
 * Get the player for a specific VOICE CHANNEL (not guild).
 * Returns null if no music is playing in that channel.
 */
function getPlayer(voiceChannelId) {
  return voicePlayers.get(voiceChannelId) || null;
}

/**
 * Get the player for a guild's default player (legacy fallback).
 * Returns the first active player found in the guild.
 */
function getGuildPlayer(guildId) {
  for (const [, player] of voicePlayers) {
    if (player.guildId === guildId) return player;
  }
  return null;
}

/**
 * Create or get existing player for a specific voice channel.
 * Each voice channel has its own fully independent player and queue.
 */
async function getOrCreatePlayer(guild, voiceChannel, textChannel) {
  if (!kazagumo) throw new Error('Music system not initialized. Bot is still starting up.');

  const voiceId = voiceChannel.id;

  // Return existing player for this exact voice channel
  if (voicePlayers.has(voiceId)) {
    return voicePlayers.get(voiceId);
  }

  // Create a new player specifically for this voice channel
  // Use voiceId as a unique identifier to avoid guild-level conflicts
  const player = await kazagumo.createPlayer({
    guildId: guild.id,
    voiceId: voiceId,
    textId: textChannel.id,
    deaf: true
  });

  voicePlayers.set(voiceId, player);
  console.log(`[MUSIC] New player created for voice channel: ${voiceChannel.name} (${voiceId})`);

  return player;
}

/**
 * Search for a track using Lavalink.
 */
async function search(query) {
  if (!kazagumo) throw new Error('Music system not initialized.');

  const isUrl = /^https?:\/\//i.test(query);
  const searchQuery = isUrl ? query : `ytsearch:${query}`;

  const result = await kazagumo.search(searchQuery);
  return result;
}

/**
 * Destroy the player for a specific voice channel.
 */
function destroyPlayer(voiceChannelId) {
  const player = voicePlayers.get(voiceChannelId);
  if (player) {
    player.destroy();
    voicePlayers.delete(voiceChannelId);
  }
}

/**
 * Destroy ALL players in a guild (e.g. on bot kick/ban).
 */
function destroyGuildPlayers(guildId) {
  for (const [voiceId, player] of voicePlayers) {
    if (player.guildId === guildId) {
      player.destroy();
      voicePlayers.delete(voiceId);
    }
  }
}

/**
 * Get all active players for a guild (for listing active rooms).
 */
function getGuildPlayers(guildId) {
  const result = [];
  for (const [voiceId, player] of voicePlayers) {
    if (player.guildId === guildId) {
      result.push({ voiceId, player });
    }
  }
  return result;
}

module.exports = {
  init,
  getKazagumo,
  getPlayer,
  getGuildPlayer,
  getOrCreatePlayer,
  search,
  destroyPlayer,
  destroyGuildPlayers,
  getGuildPlayers
};
