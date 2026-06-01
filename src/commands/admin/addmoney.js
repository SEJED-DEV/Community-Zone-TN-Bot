const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const economy = require('../../managers/economyManager');
const { fireMilestoneLog } = require('../../utils/walletLog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addmoney')
    .setDescription('➕ [Admin] أضف Dinar TN لعضو.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt => opt.setName('user').setDescription('العضو المستهدف').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('المبلغ المراد إضافته').setRequired(true).setMinValue(1))
    .addStringOption(opt => opt.setName('reason').setDescription('السبب (اختياري)').setRequired(false)),

  async execute(client, interaction) {
    await interaction.deferReply({ ephemeral: true });
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const reason = interaction.options.getString('reason') || 'Admin';
    const { guildId } = interaction;

    const result = economy.addBalance(guildId, target.id, amount, reason);

    // Fire milestone log if balance crossed a new 100 DT mark
    fireMilestoneLog(client, interaction.guild, target.id, result.balance, result.crossedMilestone, reason).catch(() => null);

    return interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(0x10B981)
        .setTitle('➕ تم إضافة DT')
        .addFields(
          { name: 'العضو',               value: `<@${target.id}>`,                   inline: true  },
          { name: 'المبلغ المضاف',       value: `\`+${amount.toLocaleString()} DT\``, inline: true  },
          { name: 'الرصيد الجديد',       value: `\`${result.balance.toLocaleString()} DT\``,  inline: true  },
          { name: 'السبب',               value: reason,                               inline: false },
        )
        .setTimestamp()
        .setFooter({ text: `Admin: ${interaction.user.tag}` })],
    });
  },
};
