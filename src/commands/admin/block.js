const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const restrictionManager = require('../../managers/restriction');
const tempVoiceManager = require('../../managers/tempVoice');
const embedGenerator = require('../../utils/embedGenerator');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('block')
    .setDescription('Globally restrict a user or role from all temporary voice channels.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand(sub =>
      sub.setName('user')
         .setDescription('Restrict a specific user from accessing any temporary voice rooms.')
         .addUserOption(opt => opt.setName('target').setDescription('The user to block').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('role')
         .setDescription('Restrict a specific role from accessing any temporary voice rooms.')
         .addRoleOption(opt => opt.setName('target').setDescription('The role to block').setRequired(true))
    ),

  async execute(client, interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const subcommand = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (subcommand === 'user') {
      const targetUser = interaction.options.getUser('target');
      
      if (targetUser.bot) {
        return interaction.editReply({
          embeds: [embedGenerator.error('Bots cannot be globally restricted from temporary channels.')]
        });
      }

      if (restrictionManager.isUserBlocked(targetUser.id)) {
        return interaction.editReply({
          embeds: [embedGenerator.warning(`**${targetUser.tag}** is already globally restricted.`)]
        });
      }

      // Add user to global block list in memory
      restrictionManager.blockUser(targetUser.id);

      // Proactive Enforcement: Eject from any active temp voice channels
      let activeKickCount = 0;
      const activeRooms = tempVoiceManager.getAllRooms();

      for (const room of activeRooms) {
        const voiceChannel = await guild.channels.fetch(room.voiceId).catch(() => null);
        if (voiceChannel && voiceChannel.members.has(targetUser.id)) {
          const targetMember = voiceChannel.members.get(targetUser.id);
          if (targetMember) {
            await targetMember.voice.disconnect('Globally blocked by administrator').catch(() => null);
            activeKickCount++;
          }
        }
        
        // Remove text channel overrides
        const textChannel = await guild.channels.fetch(room.textId).catch(() => null);
        if (textChannel) {
          await textChannel.permissionOverwrites.delete(targetUser.id).catch(() => null);
        }
      }

      // Respond to administrator
      const responseEmbed = embedGenerator.success(
        `⛔ **${targetUser.tag}** has been globally blocked from the temporary voice system.\n` +
        `• They will be disconnected automatically if they attempt to join.\n` +
        `• They can no longer see or use any temp rooms.\n` +
        `• Proactive enforcement: Ejected from \`${activeKickCount}\` active rooms.`
      );
      await interaction.editReply({ embeds: [responseEmbed] });

      // Audit Log
      await logger.error(client, '⛔ Global User Blocked', [
        { name: 'Blocked User', value: `${targetUser.tag} (<@${targetUser.id}>)` },
        { name: 'Administrator', value: `<@${interaction.user.id}>` },
        { name: 'Proactive Ejects', value: `\`${activeKickCount}\` channels` }
      ]);

    } else if (subcommand === 'role') {
      const targetRole = interaction.options.getRole('target');

      if (targetRole.id === guild.roles.everyone.id) {
        return interaction.editReply({
          embeds: [embedGenerator.error('You cannot globally restrict the @everyone role.')]
        });
      }

      if (restrictionManager.isRoleBlocked(targetRole.id)) {
        return interaction.editReply({
          embeds: [embedGenerator.warning(`Role **${targetRole.name}** is already globally restricted.`)]
        });
      }

      // Add role to global block list in memory
      restrictionManager.blockRole(targetRole.id);

      // Proactive Enforcement: Eject all users who carry this role from any active temp voice channels
      let activeKickCount = 0;
      const activeRooms = tempVoiceManager.getAllRooms();

      for (const room of activeRooms) {
        const voiceChannel = await guild.channels.fetch(room.voiceId).catch(() => null);
        if (voiceChannel) {
          for (const [memberId, memberObj] of voiceChannel.members) {
            if (memberObj.roles.cache.has(targetRole.id)) {
              await memberObj.voice.disconnect('Globally blocked role carrying member').catch(() => null);
              activeKickCount++;
              
              // Remove text channel overrides
              const textChannel = await guild.channels.fetch(room.textId).catch(() => null);
              if (textChannel) {
                await textChannel.permissionOverwrites.delete(memberId).catch(() => null);
              }
            }
          }
        }
      }

      // Respond to administrator
      const responseEmbed = embedGenerator.success(
        `⛔ Role **${targetRole.name}** has been globally blocked from the temporary voice system.\n` +
        `• Any users possessing this role are now barred from temp rooms.\n` +
        `• Proactive enforcement: Ejected \`${activeKickCount}\` role-carrying members.`
      );
      await interaction.editReply({ embeds: [responseEmbed] });

      // Audit Log
      await logger.error(client, '⛔ Global Role Blocked', [
        { name: 'Blocked Role', value: `${targetRole.name} (<@&${targetRole.id}>)` },
        { name: 'Administrator', value: `<@${interaction.user.id}>` },
        { name: 'Proactive Ejects', value: `\`${activeKickCount}\` members` }
      ]);
    }
  }
};
