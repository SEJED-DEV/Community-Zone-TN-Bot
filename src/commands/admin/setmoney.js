const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const economy = require('../../managers/economyManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setmoney')
    .setDescription('💾 [Admin] اضبط رصيد عضو بشكل مباشر.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt => opt.setName('user').setDescription('العضو المستهدف').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('الرصيد الجديد').setRequired(true).setMinValue(0)),

  async execute(client, interaction) {
    await interaction.deferReply({ ephemeral: true });
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const { guildId } = interaction;

    const newBal = economy.setBalance(guildId, target.id, amount);

    return interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(0x6366F1)
        .setTitle('💾 تم ضبط الرصيد')
        .addFields(
          { name: 'العضو',         value: `<@${target.id}>`,                  inline: true },
          { name: 'الرصيد الجديد', value: `\`${newBal.toLocaleString()} DT\``, inline: true },
        )
        .setTimestamp()
        .setFooter({ text: `Admin: ${interaction.user.tag}` })],
    });
  },
};
