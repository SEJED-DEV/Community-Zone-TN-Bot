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
    .setName('queue')
    .setDescription('Show the music queue for your current voice channel.'),

  async execute(client, interaction) {
    await interaction.deferReply();

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.editReply({
        embeds: [embedGenerator.error('You must join a voice channel to use this command.')]
      });
    }

    const player = musicManager.getPlayer(voiceChannel.id);
    if (!player || (!player.playing && !player.paused && !player.queue.current)) {
      return interaction.editReply({
        embeds: [embedGenerator.error('There is no music playing in your voice channel.')]
      });
    }

    const current = player.queue.current;
    const upcoming = player.queue.tracks || [];

    const currentStr = current
      ? `▶️ **[${current.title}](${current.uri})** \`[${formatDuration(current.length)}]\``
      : '▶️ Nothing playing';

    const upcomingStr = upcoming.length > 0
      ? upcoming.slice(0, 10).map((t, i) =>
          `\`${i + 1}.\` [${t.title}](${t.uri}) \`[${formatDuration(t.length)}]\``
        ).join('\n')
      : '*(Queue is empty)*';

    const embed = new EmbedBuilder()
      .setColor(0x8B5CF6)
      .setTitle(`📋 Music Queue — ${voiceChannel.name}`)
      .addFields(
        { name: 'Now Playing', value: currentStr },
        { name: `Up Next (${upcoming.length} songs)`, value: upcomingStr.length > 1024 ? upcomingStr.substring(0, 1020) + '...' : upcomingStr }
      )
      .setFooter({ text: `Community Zone • Multi-Room Music${upcoming.length > 10 ? ` • Showing 10 of ${upcoming.length} songs` : ''}` })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};
