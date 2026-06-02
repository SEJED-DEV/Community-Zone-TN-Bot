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
    .setName('nowplaying')
    .setDescription('Show details about the currently playing song in your voice channel.'),

  async execute(client, interaction) {
    const voiceChannelId = interaction.member?.voice?.channelId;
    if (!voiceChannelId) {
      return interaction.reply({
        embeds: [embedGenerator.error(`You must join a voice channel to use this command.`) ],
        ephemeral: true
      });
    }

    const player = musicManager.getPlayer(voiceChannelId);
    if (!player || !player.queue.current) {
      return interaction.reply({
        embeds: [embedGenerator.error(`There is no music currently playing in your voice channel.`) ],
        ephemeral: true
      });
    }

    const current = player.queue.current;
    const duration = formatDuration(current.length);
    const position = formatDuration(player.position);
    const requester = current.requester;
    const voiceChannel = interaction.member.voice.channel;

    const embed = new EmbedBuilder()
      .setColor(0x8B5CF6)
      .setAuthor({ name: `${getSafeEmoji('music_play', client, false)} Now Playing` })
      .setTitle(current.title.length > 100 ? current.title.slice(0, 97) + '...' : current.title)
      .setURL(current.uri || null)
      .setThumbnail(current.thumbnail || null)
      .addFields(
        { name: `${getSafeEmoji('loading', client, false)} Duration`, value: `\`${position} / ${duration}\``, inline: true },
        { name: `${getSafeEmoji('member', client, false)} Requested By`, value: requester ? `<@${requester.id}>` : 'Unknown', inline: true },
        { name: `${getSafeEmoji('music_queue', client, false)} Queue`, value: `\`${player.queue.size}\` song(s) remaining`, inline: true },
        { name: '🔊 Room', value: `${voiceChannel.name}`, inline: true },
        { name: '📡 Status', value: player.paused ? `${getSafeEmoji('music_pause', client, false)} Paused` : `${getSafeEmoji('music_play', client, false)} Playing`, inline: true }
      )
      .setFooter({ text: 'Community Zone • Multi-Room Music • Dev by sejed.dev & akaza_senior' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },
};
