const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const musicManager = require('../../managers/musicManager');
const embedGenerator = require('../../utils/embedGenerator');

function formatDuration(ms) {
  if (!ms || ms === 0) return 'Live';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show details about the currently playing song in your voice channel.'),

  async execute(client, interaction) {
    await interaction.deferReply();

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.editReply({
        embeds: [embedGenerator.error('You must join a voice channel to use this command.')]
      });
    }

    const player = musicManager.getPlayer(voiceChannel.id);
    const current = player?.queue?.current;

    if (!player || !current) {
      return interaction.editReply({
        embeds: [embedGenerator.error('There is no music currently playing in your voice channel.')]
      });
    }

    const duration = formatDuration(current.length);
    const position = formatDuration(player.position);
    const requester = current.requester;

    const embed = new EmbedBuilder()
      .setColor(0x8B5CF6)
      .setAuthor({ name: '🎵 Now Playing' })
      .setTitle(current.title.length > 100 ? current.title.slice(0, 97) + '...' : current.title)
      .setURL(current.uri || null)
      .addFields(
        { name: '⏱️ Duration', value: `\`${position} / ${duration}\``, inline: true },
        { name: '👤 Requested By', value: requester ? `<@${requester.id}>` : 'Unknown', inline: true },
        { name: '📋 Queue', value: `\`${player.queue.size}\` song(s) remaining`, inline: true },
        { name: '🔊 Room', value: `${voiceChannel.name}`, inline: true },
        { name: '📡 Status', value: player.paused ? '⏸️ Paused' : '▶️ Playing', inline: true }
      )
      .setImage(current.thumbnail || null)
      .setFooter({ text: 'Community Zone • Multi-Room Music' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};
