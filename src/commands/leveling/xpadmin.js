const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const levelingManager = require('../../managers/levelingManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xpadmin')
    .setDescription('Admin tools for managing user XP and levels.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName('setxp')
        .setDescription("Manually set a user's total XP.")
        .addUserOption(opt =>
          opt.setName('user').setDescription('The user to modify.').setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('xp').setDescription('New total XP value.').setMinValue(0).setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('setlevel')
        .setDescription("Set a user's level directly (starting level configuration).")
        .addUserOption(opt =>
          opt.setName('user').setDescription('The user to modify.').setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('level')
             .setDescription('Level to set the user to (1 - 250).')
             .setMinValue(1)
             .setMaxValue(250)
             .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('addxp')
        .setDescription('Add XP to a user (bypasses cooldown).')
        .addUserOption(opt =>
          opt.setName('user').setDescription('The user to add XP to.').setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('amount').setDescription('Amount of XP to add.').setMinValue(1).setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('reset')
        .setDescription("Reset a user's XP and level to zero.")
        .addUserOption(opt =>
          opt.setName('user').setDescription('The user to reset.').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('syncrolls')
        .setDescription('Sync level roles for a user based on their current level.')
        .addUserOption(opt =>
          opt.setName('user').setDescription('The user to sync roles for.').setRequired(true)
        )
    ),

  async execute(client, interaction) {
    await interaction.deferReply({ ephemeral: true });
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    // ── /xpadmin setxp ─────────────────────────────────────
    if (sub === 'setxp') {
      const target = interaction.options.getUser('user');
      const xp = interaction.options.getInteger('xp');
      const updated = levelingManager.setUserXp(guildId, target.id, xp);

      // Auto-sync roles after manual set
      try {
        const member = await interaction.guild.members.fetch(target.id);
        const milestone = levelingManager.getMilestoneForLevel(updated.level);
        await levelingManager.updateMemberRole(member, milestone);
      } catch (_) {}

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x10B981)
            .setTitle('✅ XP Updated')
            .setDescription(`Set **${target.username}**'s XP to \`${xp.toLocaleString()}\`.\nThey are now **Level ${updated.level}** (level role synced).`)
            .setFooter({ text: 'Community Zone • XP Admin' })
            .setTimestamp(),
        ],
      });
    }

    // ── /xpadmin setlevel ──────────────────────────────────
    if (sub === 'setlevel') {
      const target = interaction.options.getUser('user');
      const level = interaction.options.getInteger('level');
      
      // Calculate cumulative XP needed to reach this exact level
      let targetXp = 0;
      for (let l = 1; l <= level; l++) {
        targetXp += levelingManager.xpForLevel(l);
      }

      // Add a tiny bit of buffer XP (e.g. 5 XP) so they are solidly into that level
      targetXp += 5;

      const updated = levelingManager.setUserXp(guildId, target.id, targetXp);

      // Auto-sync roles after manual set
      let assignedRole = null;
      let roleStatus = 'No milestone reached yet.';
      try {
        const member = await interaction.guild.members.fetch(target.id);
        const milestone = levelingManager.getMilestoneForLevel(updated.level);
        if (milestone) {
          assignedRole = await levelingManager.updateMemberRole(member, milestone);
          roleStatus = assignedRole 
            ? `Assigned <@&${assignedRole.id}> and cleaned up older roles.`
            : `Milestone role \`${milestone.name}\` not found in server.`;
        } else {
          await levelingManager.updateMemberRole(member, null);
          roleStatus = 'Cleared all level roles (level is below first milestone).';
        }
      } catch (_) {}

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x10B981)
            .setTitle('✅ Level Configured')
            .setDescription(
              `Set **${target.username}**'s level to **Level ${level}**.\n` +
              `Total XP adjusted to: \`${updated.xp.toLocaleString()} XP\`.\n\n` +
              `**Role Sync status:**\n${roleStatus}`
            )
            .setFooter({ text: 'Community Zone • XP Admin' })
            .setTimestamp(),
        ],
      });
    }

    // ── /xpadmin addxp ─────────────────────────────────────
    if (sub === 'addxp') {
      const target = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const current = levelingManager.getUserData(guildId, target.id) || { xp: 0, level: 0 };
      const updated = levelingManager.setUserXp(guildId, target.id, current.xp + amount);

      try {
        const member = await interaction.guild.members.fetch(target.id);
        const milestone = levelingManager.getMilestoneForLevel(updated.level);
        await levelingManager.updateMemberRole(member, milestone);
      } catch (_) {}

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x10B981)
            .setTitle('✅ XP Added')
            .setDescription(
              `Added \`${amount.toLocaleString()} XP\` to **${target.username}**.\n` +
              `New total: \`${updated.xp.toLocaleString()} XP\` · Level **${updated.level}** (level role synced).`
            )
            .setFooter({ text: 'Community Zone • XP Admin' })
            .setTimestamp(),
        ],
      });
    }

    // ── /xpadmin reset ─────────────────────────────────────
    if (sub === 'reset') {
      const target = interaction.options.getUser('user');
      levelingManager.resetUser(guildId, target.id);

      // Also remove all milestone roles
      try {
        const member = await interaction.guild.members.fetch(target.id);
        await levelingManager.updateMemberRole(member, null);
      } catch (_) {}

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xEF4444)
            .setTitle('🔄 User Reset')
            .setDescription(`**${target.username}**'s XP, level, and level roles have been reset to zero.`)
            .setFooter({ text: 'Community Zone • XP Admin' })
            .setTimestamp(),
        ],
      });
    }

    // ── /xpadmin syncroles ─────────────────────────────────
    if (sub === 'syncrolls') {
      const target = interaction.options.getUser('user');
      const userData = levelingManager.getUserData(guildId, target.id);

      if (!userData) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xEF4444)
              .setDescription(`❌ **${target.username}** has no XP data.`)
              .setFooter({ text: 'Community Zone • XP Admin' }),
          ],
        });
      }

      const milestone = levelingManager.getMilestoneForLevel(userData.level);
      let member;
      try {
        member = await interaction.guild.members.fetch(target.id);
      } catch (e) {
        return interaction.editReply({ content: '❌ Could not fetch member from guild.' });
      }

      const assignedRole = await levelingManager.updateMemberRole(member, milestone);

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x8B5CF6)
            .setTitle('🔄 Roles Synced')
            .setDescription(
              milestone
                ? `**${target.username}** is Level **${userData.level}**.\n` +
                  (assignedRole
                    ? `Role **${assignedRole.name}** has been assigned and all other level roles removed.`
                    : `Role \`${milestone.name}\` was not found in the server — please create it first.`)
                : `**${target.username}** hasn't reached any milestone yet (Level ${userData.level}). All level roles removed.`
            )
            .setFooter({ text: 'Community Zone • XP Admin' })
            .setTimestamp(),
        ],
      });
    }
  },
};
