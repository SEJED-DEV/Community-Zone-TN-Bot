const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../../managers/economyManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('💸 حول Dinar TN لعضو آخر.')
    .addUserOption(opt =>
      opt.setName('user').setDescription('العضو الذي تريد تحويل المبلغ إليه.').setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('amount').setDescription('المبلغ المراد تحويله (DT).').setRequired(true).setMinValue(1)
    ),

  async execute(client, interaction) {
    await interaction.deferReply({ ephemeral: false });
    const { guildId, user } = interaction;
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    if (target.id === user.id) {
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xEF4444).setTitle('❌ خطأ')
          .setDescription('لا يمكنك تحويل DT لنفسك!')
          .setFooter({ text: 'Community Zone • Dinar TN Economy' })],
      });
    }
    if (target.bot) {
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xEF4444).setTitle('❌ خطأ')
          .setDescription('لا يمكنك تحويل DT للبوتات!')
          .setFooter({ text: 'Community Zone • Dinar TN Economy' })],
      });
    }

    const success = economy.transfer(guildId, user.id, target.id, amount);
    if (!success) {
      const bal = economy.getBalance(guildId, user.id);
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xEF4444).setTitle('❌ رصيد غير كافٍ')
          .setDescription(`رصيدك: \`${bal.toLocaleString()} DT\` / المطلوب: \`${amount.toLocaleString()} DT\``)
          .setFooter({ text: 'Community Zone • Dinar TN Economy' })],
      });
    }

    const senderBal   = economy.getBalance(guildId, user.id);
    const receiverBal = economy.getBalance(guildId, target.id);

    return interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(0x10B981)
        .setTitle('💸 تم التحويل بنجاح!')
        .addFields(
          { name: '📤 المُرسِل',          value: `<@${user.id}> — رصيد متبقٍ: \`${senderBal.toLocaleString()} DT\``,   inline: false },
          { name: '📥 المُستقبِل',         value: `<@${target.id}> — رصيده الجديد: \`${receiverBal.toLocaleString()} DT\``, inline: false },
          { name: '💰 المبلغ المُحوَّل',  value: `\`${amount.toLocaleString()} DT\``,                                       inline: false },
        )
        .setTimestamp()
        .setFooter({ text: 'Community Zone • Dinar TN Economy' })],
    });
  },
};
