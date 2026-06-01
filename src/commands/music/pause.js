const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../managers/musicManager');
const embedGenerator = require('../../utils/embedGenerator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause the music in your voice channel.'),

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

    if (player.paused) {
      return interaction.editReply({
        embeds: [embedGenerator.error('The music is already paused. Use `/resume` to continue.')]
      });
    }

    await player.pause(true);
    return interaction.editReply({
      embeds: [embedGenerator.success('⏸️ Paused the music. Use `/resume` to continue.')]
    });
  }
};
