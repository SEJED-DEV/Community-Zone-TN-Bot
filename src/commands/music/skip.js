const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../managers/musicManager');
const embedGenerator = require('../../utils/embedGenerator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the currently playing song in your voice channel.'),

  async execute(client, interaction) {
    await interaction.deferReply();
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
      return interaction.editReply({
        embeds: [embedGenerator.error('You must join a voice channel to use this command.')]
      });
    }

    const player = musicManager.getPlayer(voiceChannel.id);
    if (!player || !player.playing) {
      return interaction.editReply({
        embeds: [embedGenerator.error('There is no music currently playing in your voice channel.')]
      });
    }

    await player.skip();
    return interaction.editReply({
      embeds: [embedGenerator.success('⏭️ Skipped the current song.')]
    });
  }
};
