const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const restrictionManager = require('../../managers/restriction');
const embedGenerator = require('../../utils/embedGenerator');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unblock')
    .setDescription('Globally unblock a restricted user or role from temporary voice channels.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand(sub =>
      sub.setName('user')
         .setDescription('Remove a user from the global temporary voice restrictions.')
         .addUserOption(opt => opt.setName('target').setDescription('The user to unblock').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('role')
         .setDescription('Remove a role from the global temporary voice restrictions.')
         .addRoleOption(opt => opt.setName('target').setDescription('The role to unblock').setRequired(true))
    ),

  async execute(client, interaction) {
    await interaction.deferReply({ ephemeral: true });

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'user') {
      const targetUser = interaction.options.getUser('target');

      if (!restrictionManager.isUserBlocked(targetUser.id)) {
        return interaction.editReply({
          embeds: [embedGenerator.warning(`**${targetUser.tag}** is not globally restricted.`)]
        });
      }

      // Remove user from global blocks
      restrictionManager.unblockUser(targetUser.id);

      const responseEmbed = embedGenerator.success(
        `✅ **${targetUser.tag}** has been successfully unblocked.\n` +
        `• They are now permitted to view and join temporary voice channels again.`
      );
      await interaction.editReply({ embeds: [responseEmbed] });

      // Audit Log
      await logger.success(client, '✅ Global User Unblocked', [
        { name: 'Unblocked User', value: `${targetUser.tag} (<@${targetUser.id}>)` },
        { name: 'Administrator', value: `<@${interaction.user.id}>` }
      ]);

    } else if (subcommand === 'role') {
      const targetRole = interaction.options.getRole('target');

      if (!restrictionManager.isRoleBlocked(targetRole.id)) {
        return interaction.editReply({
          embeds: [embedGenerator.warning(`Role **${targetRole.name}** is not globally restricted.`)]
        });
      }

      // Remove role from global blocks
      restrictionManager.unblockRole(targetRole.id);

      const responseEmbed = embedGenerator.success(
        `✅ Role **${targetRole.name}** has been successfully unblocked.\n` +
        `• Users with this role can now view and join temporary voice channels again.`
      );
      await interaction.editReply({ embeds: [responseEmbed] });

      // Audit Log
      await logger.success(client, '✅ Global Role Unblocked', [
        { name: 'Unblocked Role', value: `${targetRole.name} (<@&${targetRole.id}>)` },
        { name: 'Administrator', value: `<@${interaction.user.id}>` }
      ]);
    }
  }
};
