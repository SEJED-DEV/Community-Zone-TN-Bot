const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const musicManager = require('../managers/musicManager');

/**
 * Format milliseconds to mm:ss or hh:mm:ss
 */
function formatDuration(ms) {
  if (!ms || ms === 0) return 'Live';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Builds the premium "Now Playing" embed with playback controls.
 */
function buildNowPlayingEmbed(track, queueLength) {
  const duration = formatDuration(track.length);
  const requester = track.requester;

  return new EmbedBuilder()
    .setColor(0x8B5CF6)
    .setAuthor({ name: '🎵 Now Playing' })
    .setTitle(track.title.length > 100 ? track.title.slice(0, 97) + '...' : track.title)
    .setURL(track.uri || null)
    .addFields(
      { name: '⏱️ Duration', value: `\`${duration}\``, inline: true },
      { name: '👤 Requested By', value: requester ? `<@${requester.id}>` : 'Unknown', inline: true },
      { name: '📋 Queue', value: `\`${queueLength}\` song(s) remaining`, inline: true }
    )
    .setImage(track.thumbnail || null)
    .setFooter({ text: 'Community Zone • Music System  •  Use /queue to see all songs' })
    .setTimestamp();
}

/**
 * Builds the music control buttons row.
 */
const config = require('../config');
const { getSafeEmoji } = require('./emojiHelper');

function buildControlButtons(client) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('music_pause_resume')
      .setLabel('Pause / Resume')
      .setEmoji(getSafeEmoji('music_pause', client, true))
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_skip')
      .setLabel('Skip')
      .setEmoji(getSafeEmoji('music_skip', client, true))
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('music_stop')
      .setLabel('Stop')
      .setEmoji(getSafeEmoji('music_stop', client, true))
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('music_queue')
      .setLabel('Queue')
      .setEmoji(getSafeEmoji('music_queue', client, true))
      .setStyle(ButtonStyle.Secondary),
  );
}

module.exports = {
  /**
   * Register all Kazagumo event listeners that post embeds to text channels.
   * Called once from the ready event AFTER musicManager.init(client) is called.
   */
  register(client) {
    const kazagumo = musicManager.getKazagumo();
    if (!kazagumo) {
      console.error('[MUSIC EVENTS] Kazagumo not initialized! Call musicManager.init(client) first.');
      return;
    }

    // ── Track Started ──────────────────────────────────────────
    kazagumo.on('playerStart', async (player, track) => {
      const textChannel = client.channels.cache.get(player.textId);
      if (!textChannel) return;

      try {
        const embed = buildNowPlayingEmbed(track, player.queue.size);
        const controls = buildControlButtons(client);
        await textChannel.send({ embeds: [embed], components: [controls] });
      } catch (err) {
        console.error(`[MUSIC EVENT] Failed to send now-playing embed in guild ${player.guildId}:`, err.message);
      }
    });

    // ── Queue Empty ────────────────────────────────────────────
    kazagumo.on('playerEmpty', async (player) => {
      const textChannel = client.channels.cache.get(player.textId);
      if (!textChannel) return;

      try {
        await textChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x6366F1)
              .setTitle('✅ Queue Finished')
              .setDescription('All songs have been played. The bot will disconnect in **3 minutes** if no new songs are added.\n\nUse `/play` to add more music!')
              .setFooter({ text: 'Community Zone • Music System' })
              .setTimestamp()
          ]
        });
      } catch (err) {
        console.error(`[MUSIC EVENT] Failed to send queue-end embed:`, err.message);
      }
    });

    // ── Track Error ────────────────────────────────────────────
    kazagumo.on('playerError', async (player, track, error) => {
      const textChannel = client.channels.cache.get(player.textId);
      if (!textChannel) return;

      const trackName = track?.title || 'Unknown Track';
      console.error(`[MUSIC ERROR] "${trackName}" in guild ${player.guildId}:`, error?.message || error);

      try {
        await textChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0xEF4444)
              .setTitle('⚠️ Playback Error')
              .setDescription(`Failed to play **${trackName}**. Skipping to the next song.\n\n*Error: ${error?.message || 'Unknown error'}*`)
              .setFooter({ text: 'Community Zone • Music System' })
              .setTimestamp()
          ]
        });
      } catch (e) {
        // Silently fail
      }
    });

    // ── Player Closed ──────────────────────────────────────────
    kazagumo.on('playerClosed', async (player) => {
      console.log(`[MUSIC] Player closed in guild ${player.guildId}.`);
    });

    console.log('[MUSIC EVENTS] Lavalink event listeners registered.');
  }
};
