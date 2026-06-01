const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const economy = require('../../managers/economyManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setuproles')
    .setDescription('⚙️ [Admin] اضبط معرفات الرتب (Role IDs) الخاصة بالمتجر.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(opt => opt.setName('diamond').setDescription('💎 Diamond Role').setRequired(false))
    .addRoleOption(opt => opt.setName('vip').setDescription('👑 VIP Role').setRequired(false)),

  async execute(client, interaction) {
    await interaction.deferReply({ ephemeral: true });
    const { guildId } = interaction;

    const diamond = interaction.options.getRole('diamond');
    const vip     = interaction.options.getRole('vip');

    let updatedCount = 0;
    const fields = [];

    if (diamond) {
      economy.setRoleId(guildId, 'diamond', diamond.id);
      fields.push({ name: '💎 Diamond Role', value: `<@&${diamond.id}>`, inline: true });
      updatedCount++;
    }
    if (vip) {
      economy.setRoleId(guildId, 'vip', vip.id);
      fields.push({ name: '👑 VIP Role', value: `<@&${vip.id}>`, inline: true });
      updatedCount++;
    }

    if (updatedCount === 0) {
      // Just show current configuration
      const diamondId = economy.getRoleId(guildId, 'diamond');
      const vipId     = economy.getRoleId(guildId, 'vip');

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0x6366F1)
          .setTitle('⚙️ إعدادات رتب المتجر الحالية')
          .setDescription('لم تقم بتحديد أي خيارات لتعديلها. إليك الإعدادات الحالية:')
          .addFields(
            { name: '💎 Diamond', value: diamondId ? `<@&${diamondId}>` : '`غير محدد`', inline: true },
            { name: '👑 VIP', value: vipId ? `<@&${vipId}>` : '`غير محدد`', inline: true },
          )
          .setTimestamp()],
      });
    }

    return interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(0x10B981)
        .setTitle('⚙️ تم تحديث رتب المتجر!')
        .setDescription(`تم بنجاح تحديث **${updatedCount}** رتبة في النظام.`)
        .addFields(fields)
        .setTimestamp()],
    });
  },
};
