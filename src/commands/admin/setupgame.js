const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setupgame')
    .setDescription('🎮 Send the Mr. White game setup panel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(client, interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x8B5CF6)
      .setTitle('🎮 Mr. White Voice Edition')
      .setDescription(
        'Click the button below to create a new game lobby!\n' +
        'اضغط على الزر أدناه لإنشاء لوبي جديد للعبة!'
      )
      .setFooter({ text: 'Community Zone • Dev by sejed.dev & akaza_senior' });

    const { emojis } = require('../../config');
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('mw_create_game_lobby')
        .setLabel('Create Lobby')
        .setEmoji(emojis.casino || '🎮')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  }
};
