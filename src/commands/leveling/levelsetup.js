const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');
const levelingManager = require('../../managers/levelingManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('levelsetup')
    .setDescription('Configure the leveling system for this server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName('channel')
        .setDescription('Set the channel where level-up messages will be sent.')
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('The text channel to send level-up announcements in.')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('enable')
        .setDescription('Enable or disable the XP leveling system.')
        .addBooleanOption(opt =>
          opt
            .setName('enabled')
            .setDescription('true = enabled, false = disabled')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Show the current leveling system configuration.')
    )
    .addSubcommand(sub =>
      sub
        .setName('createroles')
        .setDescription('Automatically create all missing milestone roles on the server.')
    ),

  async execute(client, interaction) {
    await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    // ── /levelsetup channel ────────────────────────────────
    if (sub === 'channel') {
      const channel = interaction.options.getChannel('channel');
      levelingManager.setLevelChannelId(guildId, channel.id);

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x10B981)
            .setTitle('✅ Level-Up Channel Set')
            .setDescription(`Level-up announcements will now be sent to ${channel}.`)
            .setFooter({ text: 'Community Zone • Leveling System' })
            .setTimestamp(),
        ],
      });
    }

    // ── /levelsetup enable ────────────────────────────────
    if (sub === 'enable') {
      const enabled = interaction.options.getBoolean('enabled');
      levelingManager.setLevelingEnabled(guildId, enabled);

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(enabled ? 0x10B981 : 0xEF4444)
            .setTitle(enabled ? '✅ Leveling System Enabled' : '🔴 Leveling System Disabled')
            .setDescription(
              enabled
                ? 'Users will now earn XP for chatting.'
                : 'No XP will be awarded until you re-enable the system.'
            )
            .setFooter({ text: 'Community Zone • Leveling System' })
            .setTimestamp(),
        ],
      });
    }

    // ── /levelsetup status ─────────────────────────────────
    if (sub === 'status') {
      const enabled = levelingManager.getLevelingEnabled(guildId);
      const channelId = levelingManager.getLevelChannelId(guildId);
      const channelStr = channelId ? `<#${channelId}>` : '`Not set` (messages appear in the same channel as the user)';

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x6366F1)
            .setTitle('⚙️ Leveling System Configuration')
            .addFields(
              { name: '🔘 Status', value: enabled ? '✅ **Enabled**' : '🔴 **Disabled**', inline: true },
              { name: '📣 Level-Up Channel', value: channelStr, inline: true },
              { name: '📊 XP Cooldown', value: '`15 seconds` per user', inline: true },
              { name: '🎲 XP Per Message', value: '`15 – 25 XP` (randomized)', inline: true },
              { name: '🏆 Max Level', value: '`250`', inline: true },
              { name: '🎖️ Milestone Roles', value: '`50 roles` (every 5 levels)', inline: true },
            )
            .setFooter({ text: 'Community Zone • Leveling System' })
            .setTimestamp(),
        ],
      });
    }

    // ── /levelsetup createroles ────────────────────────────
    if (sub === 'createroles') {
      const milestones = levelingManager.getAllMilestones();
      
      // Fetch all roles to populate cache
      await interaction.guild.roles.fetch().catch(() => null);
      const existing = new Set(interaction.guild.roles.cache.map(r => r.name));
      const missing = milestones.filter(m => !existing.has(m.name));

      if (missing.length === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x10B981)
              .setTitle('✅ Milestone Roles Setup Complete')
              .setDescription('All 50 level milestone roles already exist in the server!')
              .setFooter({ text: 'Community Zone • Leveling System' })
              .setTimestamp(),
          ],
        });
      }

      // Pre-reply informing the admin we are creating the roles
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x3B82F6)
            .setTitle('⚙️ Creating Milestone Roles')
            .setDescription(`Creating **${missing.length}** missing milestone roles. Please wait a few seconds...`)
            .setFooter({ text: 'Community Zone • Leveling System' })
            .setTimestamp(),
        ],
      });

      // Create missing roles
      let createdCount = 0;
      for (const m of missing) {
        try {
          await interaction.guild.roles.create({
            name: m.name,
            reason: 'Leveling system setup: Auto-creating milestone roles.',
          });
          createdCount++;
        } catch (err) {
          console.error(`[LEVELSETUP] Failed to create role "${m.name}":`, err);
        }
      }

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x10B981)
            .setTitle('✅ Milestone Roles Setup Complete')
            .setDescription(
              `Successfully created **${createdCount}** level milestone roles in the server!\n\n` +
              `**⚠️ Important Role Hierarchy Warning:**\n` +
              `Make sure to go to **Server Settings > Roles** and drag the bot's own role (e.g. \`Community Zone\`) **ABOVE** all of the new level milestone roles. Otherwise, Discord will block the bot from assigning them.`
            )
            .setFooter({ text: 'Community Zone • Leveling System' })
            .setTimestamp(),
        ],
      });
    }
  },
};
