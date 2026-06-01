const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../managers/musicManager');
const embedGenerator = require('../../utils/embedGenerator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop music and disconnect from your voice channel.'),

  async execute(client, interaction) {
    await interaction.deferReply();
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
      return interaction.editReply({
        embeds: [embedGenerator.error('You must join a voice channel to use this command.')]
      });
    }

    // Look up player by the user's voice channel ID
    const player = musicManager.getPlayer(voiceChannel.id);
    if (!player) {
      return interaction.editReply({
        embeds: [embedGenerator.error('There is no music playing in your voice channel.')]
      });
    }

    musicManager.destroyPlayer(voiceChannel.id);
    return interaction.editReply({
      embeds: [embedGenerator.success(`⏹️ Stopped playback and disconnected from **${voiceChannel.name}**.`)]
    });
  }
};
