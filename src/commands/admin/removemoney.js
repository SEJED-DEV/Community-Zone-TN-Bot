const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const economy = require('../../managers/economyManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removemoney')
    .setDescription('➖ [Admin] اسحب Dinar TN من عضو.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt => opt.setName('user').setDescription('العضو المستهدف').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('المبلغ المراد سحبه').setRequired(true).setMinValue(1))
    .addStringOption(opt => opt.setName('reason').setDescription('السبب (اختياري)').setRequired(false)),

  async execute(client, interaction) {
    await interaction.deferReply({ ephemeral: true });
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const reason = interaction.options.getString('reason') || 'Admin';
    const { guildId } = interaction;

    const newBal = economy.removeBalance(guildId, target.id, amount, reason);

    return interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(0xEF4444)
        .setTitle('➖ تم سحب DT')
        .addFields(
          { name: 'العضو',         value: `<@${target.id}>`,                   inline: true  },
          { name: 'المبلغ المسحوب', value: `\`-${amount.toLocaleString()} DT\``, inline: true  },
          { name: 'الرصيد الجديد', value: `\`${newBal.toLocaleString()} DT\``,  inline: true  },
          { name: 'السبب',         value: reason,                               inline: false },
        )
        .setTimestamp()
        .setFooter({ text: `Admin: ${interaction.user.tag}` })],
    });
  },
};
