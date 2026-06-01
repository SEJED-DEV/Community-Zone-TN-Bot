const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
} = require('discord.js');
const logger = require('../../utils/logger');

// ─── The two "restricted" roles that are blocked from viewing categories ───────
const RESTRICTED_ROLE_IDS = [
  '1508980786949390460',
  '1509002153426030675',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hidecategory')
    .setDescription('Control whether restricted roles can see a category and all channels inside it.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName('hide')
        .setDescription('Hide a category + its channels from the restricted roles.')
        .addChannelOption(opt =>
          opt
            .setName('category')
            .setDescription('The category to hide.')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('show')
        .setDescription('Restore visibility of a category + its channels for the restricted roles.')
        .addChannelOption(opt =>
          opt
            .setName('category')
            .setDescription('The category to show again.')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
    ),

  async execute(client, interaction) {
    await interaction.deferReply({ ephemeral: true });

    const subcommand = interaction.options.getSubcommand();
    const category   = interaction.options.getChannel('category');
    const guild      = interaction.guild;

    // Verify the channel is actually a category (double-check)
    if (category.type !== ChannelType.GuildCategory) {
      return interaction.editReply({
        content: '❌ Please select a **category** channel, not a regular channel.',
      });
    }

    const isHide = subcommand === 'hide';

    // ── Resolve the role objects ───────────────────────────────────────────────
    let roles = [];
    for (const roleId of RESTRICTED_ROLE_IDS) {
      const role = guild.roles.cache.get(roleId) || await guild.roles.fetch(roleId).catch(() => null);
      if (role) roles.push(role);
    }

    if (roles.length === 0) {
      return interaction.editReply({
        content: '❌ Could not find either of the restricted roles in this server. Make sure the role IDs are correct.',
      });
    }

    // ── Apply / remove the ViewChannel deny on the category itself ─────────────
    try {
      for (const role of roles) {
        if (isHide) {
          await category.permissionOverwrites.edit(role, {
            ViewChannel: false,
          });
        } else {
          // Remove the explicit deny so the role falls back to its default perms
          await category.permissionOverwrites.delete(role);
        }
      }
    } catch (err) {
      console.error('[HIDECATEGORY] Failed to edit category overwrite:', err);
      return interaction.editReply({
        content: `❌ Failed to update permissions on the category: \`${err.message}\``,
      });
    }

    // ── Sync every child channel to match the category ─────────────────────────
    const childChannels = guild.channels.cache.filter(
      c => c.parentId === category.id
    );

    let synced  = 0;
    let failed  = 0;

    for (const [, ch] of childChannels) {
      try {
        await ch.lockPermissions(); // copies parent (category) overwrites to this channel
        synced++;
      } catch {
        failed++;
      }
    }

    // ── Build the confirmation embed ───────────────────────────────────────────
    const rolesList = roles.map(r => `<@&${r.id}>`).join('\n');

    const embed = new EmbedBuilder()
      .setColor(isHide ? 0xEF4444 : 0x10B981)
      .setTitle(isHide ? '🔒 Category Hidden' : '🔓 Category Visible')
      .setDescription(
        isHide
          ? `The category **${category.name}** and all channels inside it are now **hidden** from the restricted roles.`
          : `The category **${category.name}** and all channels inside it are now **visible** again to the restricted roles.`
      )
      .addFields(
        {
          name: '📂 Category',
          value: `<#${category.id}>`,
          inline: true,
        },
        {
          name: '🔐 Affected Roles',
          value: rolesList,
          inline: true,
        },
        {
          name: '🔄 Channels Synced',
          value: `✅ ${synced} synced${failed > 0 ? `  ❌ ${failed} failed` : ''}`,
          inline: false,
        }
      )
      .setFooter({ text: 'Community Zone • Category Visibility Manager' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // ── Audit log ──────────────────────────────────────────────────────────────
    await logger.success(client,
      isHide ? '🔒 Category Hidden from Restricted Roles' : '🔓 Category Restored for Restricted Roles',
      [
        { name: 'Category',       value: `${category.name} (<#${category.id}>)` },
        { name: 'Affected Roles', value: roles.map(r => `${r.name} (${r.id})`).join('\n') },
        { name: 'Channels',       value: `${synced} synced, ${failed} failed` },
        { name: 'Admin',          value: `<@${interaction.user.id}>` },
      ]
    ).catch(() => null);
  },
};
