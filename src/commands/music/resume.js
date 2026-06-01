const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../managers/musicManager');
const embedGenerator = require('../../utils/embedGenerator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume the paused music in your voice channel.'),

  async execute(client, interaction) {
    await interaction.deferReply();
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
      return interaction.editReply({
        embeds: [embedGenerator.error('You must join a voice channel to use this command.')]
      });
    }

    const player = musicManager.getPlayer(voiceChannel.id);
    if (!player) {
      return interaction.editReply({
        embeds: [embedGenerator.error('There is no music player active in your voice channel.')]
      });
    }

    if (!player.paused) {
      return interaction.editReply({
        embeds: [embedGenerator.error('The music is not paused right now.')]
      });
    }

    await player.pause(false);
    return interaction.editReply({
      embeds: [embedGenerator.success('▶️ Resumed the music!')]
    });
  }
};
