const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const musicManager = require('../../managers/musicManager');
const embedGenerator = require('../../utils/embedGenerator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play music in your current voice channel. Each room has its own queue!')
    .addStringOption(option =>
      option
        .setName('query')
        .setDescription('YouTube URL (video or playlist), or a song name to search.')
        .setRequired(true)
    ),

  async execute(client, interaction) {
    await interaction.deferReply();

    const query = interaction.options.getString('query').trim();
    const member = interaction.member;
    const voiceChannel = member.voice.channel;

    // Must be in a voice channel
    if (!voiceChannel) {
      return interaction.editReply({
        embeds: [embedGenerator.error('You must join a voice channel before playing music!', '🔊 Voice Required')]
      });
    }

    // Check bot permissions
    const permissions = voiceChannel.permissionsFor(client.user);
    if (!permissions.has('Connect') || !permissions.has('Speak')) {
      return interaction.editReply({
        embeds: [embedGenerator.error(`I don't have permission to join or speak in ${voiceChannel}.`, '⛔ Missing Permissions')]
      });
    }

    try {
      // Search for the track via Lavalink
      const result = await musicManager.search(query);

      if (!result || !result.tracks || result.tracks.length === 0) {
        return interaction.editReply({
          embeds: [embedGenerator.error(`No results found for **"${query}"**. Try a different search term or URL.`, '❌ No Results')]
        });
      }

      // Tag each track with the requester
      result.tracks.forEach(track => { track.requester = interaction.user; });

      // Get or create a player specifically for THIS voice channel
      const player = await musicManager.getOrCreatePlayer(
        interaction.guild,
        voiceChannel,
        interaction.channel
      );

      // ── Playlist ────────────────────────────────────────────
      if (result.type === 'PLAYLIST') {
        player.queue.add(result.tracks);
        if (!player.playing && !player.paused) await player.play();

        const embed = new EmbedBuilder()
          .setColor(0x8B5CF6)
          .setTitle('📋 Playlist Added to Queue')
          .setDescription(`**${result.playlistName || 'Playlist'}**\nAdded **${result.tracks.length}** songs to the queue in ${voiceChannel}.`)
          .addFields(
            { name: '👤 Requested By', value: `<@${interaction.user.id}>`, inline: true },
            { name: '🔊 Room', value: `${voiceChannel.name}`, inline: true }
          )
          .setFooter({ text: 'Community Zone • Multi-Room Music' });

        const thumb = result.tracks[0]?.thumbnail;
        if (thumb) embed.setThumbnail(thumb);

        return interaction.editReply({ embeds: [embed] });
      }

      // ── Single Track (URL or Search result) ─────────────────
      const track = result.tracks[0];
      player.queue.add(track);

      const wasPlaying = player.playing || player.paused;
      if (!wasPlaying) await player.play();

      if (wasPlaying) {
        const embed = new EmbedBuilder()
          .setColor(0x8B5CF6)
          .setTitle('📝 Added to Queue')
          .setDescription(`[${track.title}](${track.uri})`)
          .addFields(
            { name: '👤 Requested By', value: `<@${interaction.user.id}>`, inline: true },
            { name: '⏱️ Duration', value: `\`${formatDuration(track.length)}\``, inline: true },
            { name: '📋 Position', value: `\`#${player.queue.size}\``, inline: true },
            { name: '🔊 Room', value: `${voiceChannel.name}`, inline: true }
          )
          .setFooter({ text: 'Community Zone • Multi-Room Music' });

        if (track.thumbnail) embed.setThumbnail(track.thumbnail);

        return interaction.editReply({ embeds: [embed] });
      }

      return interaction.editReply({ content: `🎶 Starting playback in **${voiceChannel.name}**...` });

    } catch (error) {
      console.error('[PLAY COMMAND ERROR]', error);

      if (error.message?.includes('not initialized') || error.message?.includes('No available nodes')) {
        return interaction.editReply({
          embeds: [embedGenerator.error(
            'The music system is still connecting to the audio server. Please wait a few seconds and try again.',
            '⏳ Music System Starting'
          )]
        });
      }

      return interaction.editReply({
        embeds: [embedGenerator.error('Something went wrong while trying to play that. Please try again.', '❌ Playback Error')]
      });
    }
  }
};

function formatDuration(ms) {
  if (!ms || ms === 0) return 'Live';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
