const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../../config');
const logger = require('../../utils/logger');
const embedGenerator = require('../../utils/embedGenerator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server with a public announcement.')
    // ── Only members with Administrator permission can use this ──
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt =>
      opt.setName('user')
         .setDescription('The member you want to ban.')
         .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason')
         .setDescription('The reason for the ban (will be publicly announced).')
         .setRequired(true)
         .setMaxLength(512)
    )
    .addIntegerOption(opt =>
      opt.setName('delete_days')
         .setDescription('Number of days of messages to delete (0–7). Default: 0')
         .setMinValue(0)
         .setMaxValue(7)
         .setRequired(false)
    ),

  async execute(client, interaction) {
    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser('user');
    const reason     = interaction.options.getString('reason');
    const deleteDays = interaction.options.getInteger('delete_days') ?? 0;

    // ── Runtime Administrator check (double safety) ───────────────────────────
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.editReply({
        embeds: [embedGenerator.error('⛔ Only **Administrators** can use this command.')]
      });
    }

    // ── Basic self / bot guards ───────────────────────────────────────────────
    if (targetUser.id === interaction.user.id) {
      return interaction.editReply({
        embeds: [embedGenerator.error('⚠️ You cannot ban yourself.')]
      });
    }

    if (targetUser.id === client.user.id) {
      return interaction.editReply({
        embeds: [embedGenerator.error('⚠️ You cannot ban the bot.')]
      });
    }

    // ── Role hierarchy check ──────────────────────────────────────────────────
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (targetMember) {
      if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
        return interaction.editReply({
          embeds: [embedGenerator.error('⚠️ You cannot ban a member with an equal or higher role than yours.')]
        });
      }
      if (!targetMember.bannable) {
        return interaction.editReply({
          embeds: [embedGenerator.error('⚠️ I do not have permission to ban this member. Make sure my role is above theirs.')]
        });
      }
    }

    // ── DM the user BEFORE banning ────────────────────────────────────────────
    const dmEmbed = new EmbedBuilder()
      .setTitle('🔨 You Have Been Banned')
      .setColor(0xEF4444)
      .setDescription(
        `You have been **permanently banned** from **${interaction.guild.name}**.\n\n` +
        `>>> 📋 **Reason:**\n${reason}`
      )
      .addFields([
        { name: '🏠 Server',     value: interaction.guild.name, inline: true },
        { name: '👮 Banned By',  value: interaction.user.tag,   inline: true },
        { name: '📅 Date',       value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
      ])
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
      .setTimestamp()
      .setFooter({ text: `${interaction.guild.name} • Moderation System` });

    const dmResult = await targetUser.send({ embeds: [dmEmbed] }).then(() => true).catch(() => false);

    // ── Execute the ban ───────────────────────────────────────────────────────
    try {
      await interaction.guild.members.ban(targetUser.id, {
        deleteMessageSeconds: deleteDays * 86400,
        reason: `Banned by ${interaction.user.tag}: ${reason}`,
      });
    } catch (error) {
      console.error('[BAN ERROR]', error);
      return interaction.editReply({
        embeds: [embedGenerator.error(`Failed to ban **${targetUser.tag}**.\n\`${error.message}\``)]
      });
    }

    // ── Public Ban Announcement ───────────────────────────────────────────────
    const announcementEmbed = new EmbedBuilder()
      .setTitle('⛔ Member Banned')
      .setColor(0xEF4444)
      .setDescription(
        `> 🚨 **${targetUser.tag}** has been permanently banned from **${interaction.guild.name}**.\n\n` +
        `📋 **Reason:**\n\`\`\`${reason}\`\`\``
      )
      .addFields([
        { name: '👤 Banned Member',      value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
        { name: '👮 Banned By',          value: `<@${interaction.user.id}>`, inline: true },
        { name: '📅 Banned At',          value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
      ])
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setTimestamp()
      .setFooter({ text: `User ID: ${targetUser.id} • Community Zone Moderation` });

    const announcementChannelId = config.banAnnouncementChannelId;
    if (announcementChannelId) {
      const announcementChannel = await interaction.guild.channels.fetch(announcementChannelId).catch(() => null);
      if (announcementChannel) {
        await announcementChannel.send({
          // @everyone ping — visible to all members
          content: `@everyone ⚠️ **${targetUser.tag}** has been banned from the server.\n📋 **Reason:** ${reason}`,
          embeds: [announcementEmbed],
          allowedMentions: { parse: ['everyone'] },
        }).catch(() => null);
      }
    }

    // ── Audit log ─────────────────────────────────────────────────────────────
    await logger.warning(client, '⛔ Member Banned', [
      { name: 'Target',            value: `${targetUser.tag} (\`${targetUser.id}\`)` },
      { name: 'Banned By',         value: `${interaction.user.tag} (<@${interaction.user.id}>)` },
      { name: 'Reason',            value: reason },
      { name: 'Messages Deleted',  value: `${deleteDays} day(s)` },
    ], config.logChannels.moderationCommandUsed);

    // ── Confirm to executor ───────────────────────────────────────────────────
    const confirmEmbed = new EmbedBuilder()
      .setTitle('✅ Ban Executed Successfully')
      .setColor(0x10B981)
      .setDescription(
        `**${targetUser.tag}** has been permanently banned.\n\n` +
        `📋 **Reason:** ${reason}\n` +
        `✉️ **Private DM:** ${dmResult ? '✅ Delivered to the user' : '❌ Could not deliver (user has DMs closed)'}\n` +
        `📢 **Public announcement** sent${announcementChannelId ? ` to <#${announcementChannelId}>` : ' *(no announcement channel set — use /setup)*'}.`
      )
      .setTimestamp();

    return interaction.editReply({ embeds: [confirmEmbed] });
  },
};
