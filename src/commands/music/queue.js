const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const musicManager = require('../../managers/musicManager');
const embedGenerator = require('../../utils/embedGenerator');
const { getSafeEmoji } = require('../../utils/emojiHelper');

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
    const voiceChannelId = interaction.member?.voice?.channelId;
    if (!voiceChannelId) {
      return interaction.reply({
        embeds: [embedGenerator.error(`You must join a voice channel to use this command.`) ],
        ephemeral: true
      });
    }

    const player = musicManager.getPlayer(voiceChannelId);
    if (!player) {
      return interaction.reply({
        embeds: [embedGenerator.error(`No music is currently playing in your voice channel.`) ],
        ephemeral: true
      });
    }

    const current = player.queue.current;
    const upcoming = player.queue.tracks || [];

    if (!current && upcoming.length === 0) {
      return interaction.reply({
        embeds: [embedGenerator.info('The queue is currently empty.', `${getSafeEmoji('music_queue', client, false)} Queue Empty`) ],
        ephemeral: true
      });
    }

    const ITEMS_PER_PAGE = 10;
    const pageItems = upcoming.slice(0, ITEMS_PER_PAGE);

    const nowPlayingLine = current
      ? `${getSafeEmoji('music_play', client, false)} **Now Playing:**\n> **${current.title}**\n> ⏱️ \`${formatDuration(current.length)}\`\n\n`
      : '';

    const queueLines = pageItems.map((song, i) =>
      `\`${i + 1}.\` **${song.title.length > 45 ? song.title.slice(0, 42) + '...' : song.title}** — \`${formatDuration(song.length)}\``
    ).join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x8B5CF6)
      .setTitle(`${getSafeEmoji('music_queue', client, false)} Music Queue`)
      .setDescription(
        nowPlayingLine +
        (upcoming.length > 0
          ? `**Up Next (${upcoming.length} song${upcoming.length !== 1 ? 's' : ''}):**\n${queueLines}` +
            (upcoming.length > ITEMS_PER_PAGE ? `\n\n*...and ${upcoming.length - ITEMS_PER_PAGE} more.*` : '')
          : '`No more songs queued.`')
      )
      .setFooter({ text: `Community Zone • Music System • Dev by sejed.dev & akaza_senior` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },
};
