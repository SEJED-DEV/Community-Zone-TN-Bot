const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const levelingManager = require('../../managers/levelingManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addxp')
    .setDescription('➕ [Admin] أضف نقاط خبرة (XP) لعضو.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt => opt.setName('user').setDescription('العضو المستهدف').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('كمية الـ XP المراد إضافتها').setRequired(true).setMinValue(1)),

  async execute(client, interaction) {
    await interaction.deferReply({ ephemeral: true });
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const { guildId } = interaction;

    const userData = levelingManager.getUserData(guildId, target.id) || { xp: 0, level: 0 };
    const oldXp = userData.xp;
    const newXp = oldXp + amount;

    const updatedData = levelingManager.setUserXp(guildId, target.id, newXp);

    // Check if user leveled up to assign milestone roles
    const oldLevel = userData.level;
    const newLevel = updatedData.level;

    if (newLevel > oldLevel) {
      const member = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (member) {
        const milestone = levelingManager.getMilestoneForLevel(newLevel);
        if (milestone) {
          await levelingManager.updateMemberRole(member, milestone);
        }
      }
    }

    return interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(0x10B981)
        .setTitle('➕ تم إضافة XP')
        .addFields(
          { name: 'العضو',         value: `<@${target.id}>`,                   inline: true },
          { name: 'XP المضاف',     value: `\`+${amount.toLocaleString()} XP\``, inline: true },
          { name: 'المستوى الجديد', value: `\`Level ${newLevel}\``,             inline: true },
          { name: 'إجمالي XP',     value: `\`${updatedData.xp.toLocaleString()} XP\``, inline: false },
        )
        .setTimestamp()
        .setFooter({ text: `Admin: ${interaction.user.tag}` })],
    });
  },
};
