const { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle 
} = require('discord.js');
const config = require('../../config');
const logger = require('../../utils/logger');
const embedGenerator = require('../../utils/embedGenerator');
const warnManager = require('../../utils/warnManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Open the moderation and warning panel for a user.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt =>
      opt.setName('user')
         .setDescription('The member to check or warn.')
         .setRequired(true)
    ),

  async execute(client, interaction) {
    const targetUser = interaction.options.getUser('user');
    
    // Runtime Administrator check
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        embeds: [embedGenerator.error('⛔ Only **Administrators** can use this command.')],
        ephemeral: true
      });
    }

    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        embeds: [embedGenerator.error('⚠️ You cannot moderation-check yourself.')],
        ephemeral: true
      });
    }

    if (targetUser.id === client.user.id) {
      return interaction.reply({
        embeds: [embedGenerator.error('⚠️ You cannot moderation-check the bot.')],
        ephemeral: true
      });
    }

    const guildId = interaction.guildId;
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    const isBanned = await interaction.guild.bans.fetch(targetUser.id).then(() => true).catch(() => false);

    // Build the function that creates the status embed and buttons
    function generatePanel(guildId, targetUser, targetMember, isBanned) {
      const warns = warnManager.getUserWarnings(guildId, targetUser.id);
      
      let warnColor;
      let warnEmoji;
      switch (warns.warnCount) {
        case 1:
          warnColor = config.colors.warning;
          warnEmoji = '🟡 Warn 1/3';
          break;
        case 2:
          warnColor = config.colors.warning;
          warnEmoji = '🟠 Warn 2/3';
          break;
        case 3:
          warnColor = config.colors.danger;
          warnEmoji = '🔴 Warn 3/3';
          break;
        default:
          warnColor = config.colors.success;
          warnEmoji = '🟢 No Warnings (0/3)';
          break;
      }

      const embed = new EmbedBuilder()
        .setTitle(`🛡️ Moderation Panel: ${targetUser.username}`)
        .setColor(isBanned ? config.colors.danger : warnColor)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '👤 Member', value: `<@${targetUser.id}> (\`${targetUser.tag}\`)`, inline: true },
          { name: '🆔 ID', value: `\`${targetUser.id}\``, inline: true },
          { name: '⚠️ Status', value: isBanned ? '🔨 **Permanently Banned**' : `**${warnEmoji}**`, inline: true }
        );

      if (warns.history.length > 0) {
        const historyList = warns.history.map((h, i) => 
          `**#${i + 1} - Level ${h.warnLevel}**\n` +
          `• **Reason:** \`${h.reason}\`\n` +
          `• **Mod:** <@${h.moderatorId}>\n` +
          `• **Time:** <t:${h.timestamp}:R>`
        ).join('\n\n');
        embed.addFields({ name: '📜 Warning History', value: historyList });
      } else {
        embed.addFields({ name: '📜 Warning History', value: '*No warnings logged.*' });
      }

      // If level is 3, suggest actions
      if (warns.warnCount >= 3) {
        embed.setDescription(`⚠️ **Warning Level 3/3 reached!** This user is eligible for severe action (Timeout, Kick, or Ban).`);
      } else {
        embed.setDescription(`Manage warnings and apply punishments directly from the controls below.`);
      }

      // Buttons
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`warn_btn_1`)
          .setLabel('⚠️ Warn 1')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(warns.warnCount >= 1),
        new ButtonBuilder()
          .setCustomId(`warn_btn_2`)
          .setLabel('🟠 Warn 2')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(warns.warnCount >= 2),
        new ButtonBuilder()
          .setCustomId(`warn_btn_3`)
          .setLabel('🔴 Warn 3')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(warns.warnCount >= 3),
        new ButtonBuilder()
          .setCustomId(`warn_btn_reset`)
          .setLabel('Reset Warnings')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(warns.warnCount === 0)
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`warn_btn_timeout`)
          .setLabel('⏳ Timeout')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!targetMember),
        new ButtonBuilder()
          .setCustomId(`warn_btn_kick`)
          .setLabel('🦶 Kick')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(!targetMember || (targetMember && !targetMember.kickable)),
        new ButtonBuilder()
          .setCustomId(isBanned ? 'warn_btn_unban' : 'warn_btn_ban')
          .setLabel(isBanned ? '🔓 Unban' : '🔨 Ban')
          .setStyle(isBanned ? ButtonStyle.Success : ButtonStyle.Danger)
          .setDisabled(!!(targetMember && !targetMember.bannable))
      );

      return { embeds: [embed], components: [row1, row2] };
    }

    const panelData = generatePanel(guildId, targetUser, targetMember, isBanned);
    const message = await interaction.reply({
      ...panelData,
      ephemeral: true,
      fetchReply: true
    });

    // Create a component collector that lasts for 5 minutes
    const collector = message.createMessageComponentCollector({
      filter: i => i.user.id === interaction.user.id,
      time: 300000 // 5 minutes
    });

    collector.on('collect', async btnInteraction => {
      const customId = btnInteraction.customId;

      // Handle Warning Button clicks (requires reason modal)
      if (customId === 'warn_btn_1' || customId === 'warn_btn_2' || customId === 'warn_btn_3') {
        const level = parseInt(customId.slice(-1), 10);
        
        const modal = new ModalBuilder()
          .setCustomId(`warn_modal_${level}`)
          .setTitle(`Issue Warning ${level}`);

        const reasonInput = new TextInputBuilder()
          .setCustomId('reason')
          .setLabel('Reason for warning')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(512)
          .setPlaceholder('Enter the warning reason here...');

        const row = new ActionRowBuilder().addComponents(reasonInput);
        modal.addComponents(row);

        await btnInteraction.showModal(modal);

        const submitted = await btnInteraction.awaitModalSubmit({
          filter: i => i.customId === `warn_modal_${level}` && i.user.id === interaction.user.id,
          time: 60000
        }).catch(() => null);

        if (submitted) {
          await submitted.deferUpdate();
          const reason = submitted.fields.getTextInputValue('reason');

          // Save Warning
          warnManager.addWarning(guildId, targetUser.id, level, reason, interaction.user.id);

          // DM the user
          const dmEmbed = new EmbedBuilder()
            .setTitle(`⚠️ Warning Issued: Level ${level}/3`)
            .setColor(0xF59E0B)
            .setDescription(`You have received a **Level ${level} warning** in **${interaction.guild.name}**.\n\n>>> **Reason:** ${reason}`)
            .setFooter({ text: `${interaction.guild.name} • Warning System` })
            .setTimestamp();
          await targetUser.send({ embeds: [dmEmbed] }).catch(() => null);

          // Log warning to server log channel (config.warnChannelId)
          const warnLogChannelId = config.warnChannelId || config.logChannelId;
          if (warnLogChannelId) {
            const logChannel = await interaction.guild.channels.fetch(warnLogChannelId).catch(() => null);
            if (logChannel) {
              const logEmbed = new EmbedBuilder()
                .setTitle(`⚠️ Warning Logged: Level ${level}`)
                .setColor(0xF59E0B)
                .addFields(
                  { name: '👤 Target', value: `<@${targetUser.id}> (\`${targetUser.tag}\`)`, inline: true },
                  { name: '👮 Moderator', value: `<@${interaction.user.id}>`, inline: true },
                  { name: '📋 Reason', value: `\`\`\`${reason}\`\`\`` }
                )
                .setTimestamp();
              await logChannel.send({ embeds: [logEmbed] }).catch(() => null);
            }
          }

          // Update general logs
          await logger.warning(client, `⚠️ Warn Level ${level} Issued`, [
            { name: 'Target', value: `${targetUser.tag} (\`${targetUser.id}\`)` },
            { name: 'Moderator', value: `${interaction.user.tag}` },
            { name: 'Reason', value: reason }
          ]);

          // Update panel
          const updatedPanel = generatePanel(guildId, targetUser, targetMember, isBanned);
          await interaction.editReply(updatedPanel);
        }
      }

      // Handle Reset Warnings click
      else if (customId === 'warn_btn_reset') {
        const modal = new ModalBuilder()
          .setCustomId('warn_modal_reset')
          .setTitle('Reset Warnings');

        const reasonInput = new TextInputBuilder()
          .setCustomId('reason')
          .setLabel('Reason for warning reset')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(256)
          .setPlaceholder('Enter why you are resetting these warnings...');

        const row = new ActionRowBuilder().addComponents(reasonInput);
        modal.addComponents(row);

        await btnInteraction.showModal(modal);

        const submitted = await btnInteraction.awaitModalSubmit({
          filter: i => i.customId === 'warn_modal_reset' && i.user.id === interaction.user.id,
          time: 60000
        }).catch(() => null);

        if (submitted) {
          await submitted.deferUpdate();
          const reason = submitted.fields.getTextInputValue('reason');

          // Reset warnings
          warnManager.resetWarnings(guildId, targetUser.id);

          // DM User
          const dmEmbed = new EmbedBuilder()
            .setTitle(`💚 Warnings Cleared`)
            .setColor(0x10B981)
            .setDescription(`Your warnings in **${interaction.guild.name}** have been cleared.\n\n>>> **Reason:** ${reason}`)
            .setFooter({ text: `${interaction.guild.name} • Warning System` })
            .setTimestamp();
          await targetUser.send({ embeds: [dmEmbed] }).catch(() => null);

          // Log warning to server log channel (config.warnChannelId)
          const warnLogChannelId = config.warnChannelId || config.logChannelId;
          if (warnLogChannelId) {
            const logChannel = await interaction.guild.channels.fetch(warnLogChannelId).catch(() => null);
            if (logChannel) {
              const logEmbed = new EmbedBuilder()
                .setTitle('💚 Warnings Reset')
                .setColor(0x10B981)
                .addFields(
                  { name: '👤 Target', value: `<@${targetUser.id}> (\`${targetUser.tag}\`)`, inline: true },
                  { name: '👮 Moderator', value: `<@${interaction.user.id}>`, inline: true },
                  { name: '📋 Reason', value: `\`\`\`${reason}\`\`\`` }
                )
                .setTimestamp();
              await logChannel.send({ embeds: [logEmbed] }).catch(() => null);
            }
          }

          // Update general logs
          await logger.success(client, '💚 Warnings Reset', [
            { name: 'Target', value: `${targetUser.tag} (\`${targetUser.id}\`)` },
            { name: 'Moderator', value: `${interaction.user.tag}` },
            { name: 'Reason', value: reason }
          ]);

          // Update panel
          const updatedPanel = generatePanel(guildId, targetUser, targetMember, isBanned);
          await interaction.editReply(updatedPanel);
        }
      }

      // Handle Timeout click
      else if (customId === 'warn_btn_timeout') {
        if (!targetMember) return btnInteraction.reply({ content: 'Member is no longer in the guild.', ephemeral: true });

        const modal = new ModalBuilder()
          .setCustomId('warn_modal_timeout')
          .setTitle(`Timeout ${targetUser.username}`);

        const durationInput = new TextInputBuilder()
          .setCustomId('duration')
          .setLabel('Duration (e.g. 5m, 1h, 1d, 1w)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(10)
          .setPlaceholder('5m / 1h / 1d / 1w...');

        const reasonInput = new TextInputBuilder()
          .setCustomId('reason')
          .setLabel('Reason for timeout')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(512)
          .setPlaceholder('Enter the timeout reason...');

        modal.addComponents(
          new ActionRowBuilder().addComponents(durationInput),
          new ActionRowBuilder().addComponents(reasonInput)
        );

        await btnInteraction.showModal(modal);

        const submitted = await btnInteraction.awaitModalSubmit({
          filter: i => i.customId === 'warn_modal_timeout' && i.user.id === interaction.user.id,
          time: 60000
        }).catch(() => null);

        if (submitted) {
          await submitted.deferUpdate();
          const durationStr = submitted.fields.getTextInputValue('duration');
          const reason = submitted.fields.getTextInputValue('reason');

          // Parse duration
          const durationMs = parseDuration(durationStr);
          if (!durationMs) {
            return interaction.followUp({
              embeds: [embedGenerator.error('Invalid duration format! Use e.g. `5m`, `1h`, `1d`, `1w`.')],
              ephemeral: true
            });
          }

          // Check hierarchy
          if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.followUp({
              embeds: [embedGenerator.error('You cannot timeout a member with equal or higher roles.')],
              ephemeral: true
            });
          }

          try {
            // DM first
            const dmEmbed = new EmbedBuilder()
              .setTitle('⏳ You Have Been Timed Out')
              .setColor(0xEF4444)
              .setDescription(`You have been put on timeout in **${interaction.guild.name}**.\n\n>>> 📋 **Reason:** ${reason}\n⏳ **Duration:** ${durationStr}`)
              .setTimestamp();
            await targetUser.send({ embeds: [dmEmbed] }).catch(() => null);

            // Apply timeout
            await targetMember.timeout(durationMs, `Timed out by ${interaction.user.tag}: ${reason}`);

            // Log
            const timeoutLogChannelId = config.timeoutChannelId || config.logChannelId;
            if (timeoutLogChannelId) {
              const logChannel = await interaction.guild.channels.fetch(timeoutLogChannelId).catch(() => null);
              if (logChannel) {
                const logEmbed = new EmbedBuilder()
                  .setTitle('⏳ Member Timed Out')
                  .setColor(0xEF4444)
                  .addFields(
                    { name: '👤 Target', value: `<@${targetUser.id}> (\`${targetUser.tag}\`)`, inline: true },
                    { name: '👮 Moderator', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '⏳ Duration', value: durationStr, inline: true },
                    { name: '📋 Reason', value: `\`\`\`${reason}\`\`\`` }
                  )
                  .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] }).catch(() => null);
              }
            }

            await logger.warning(client, '⏳ Member Timed Out', [
              { name: 'Target', value: `${targetUser.tag} (\`${targetUser.id}\`)` },
              { name: 'Moderator', value: `${interaction.user.tag}` },
              { name: 'Duration', value: durationStr },
              { name: 'Reason', value: reason }
            ]);

            await interaction.followUp({
              embeds: [embedGenerator.success(`Timed out **${targetUser.tag}** for **${durationStr}**.\nReason: \`${reason}\``)],
              ephemeral: true
            });

            // Update panel
            const updatedPanel = generatePanel(guildId, targetUser, targetMember, isBanned);
            await interaction.editReply(updatedPanel);
          } catch (err) {
            console.error('[WARN TIMEOUT ERROR]', err);
            await interaction.followUp({
              embeds: [embedGenerator.error(`Failed to apply timeout: ${err.message}`)],
              ephemeral: true
            });
          }
        }
      }

      // Handle Kick click
      else if (customId === 'warn_btn_kick') {
        if (!targetMember) return btnInteraction.reply({ content: 'Member is no longer in the guild.', ephemeral: true });

        const modal = new ModalBuilder()
          .setCustomId('warn_modal_kick')
          .setTitle(`Kick ${targetUser.username}`);

        const reasonInput = new TextInputBuilder()
          .setCustomId('reason')
          .setLabel('Reason for kick')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(512)
          .setPlaceholder('Enter the kick reason...');

        const row = new ActionRowBuilder().addComponents(reasonInput);
        modal.addComponents(row);

        await btnInteraction.showModal(modal);

        const submitted = await btnInteraction.awaitModalSubmit({
          filter: i => i.customId === 'warn_modal_kick' && i.user.id === interaction.user.id,
          time: 60000
        }).catch(() => null);

        if (submitted) {
          await submitted.deferUpdate();
          const reason = submitted.fields.getTextInputValue('reason');

          // Check hierarchy
          if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.followUp({
              embeds: [embedGenerator.error('You cannot kick a member with equal or higher roles.')],
              ephemeral: true
            });
          }

          if (!targetMember.kickable) {
            return interaction.followUp({
              embeds: [embedGenerator.error('I cannot kick this member. Check my role position.')],
              ephemeral: true
            });
          }

          try {
            // DM first
            const dmEmbed = new EmbedBuilder()
              .setTitle('🦶 You Have Been Kicked')
              .setColor(0xEF4444)
              .setDescription(`You have been kicked from **${interaction.guild.name}**.\n\n>>> 📋 **Reason:** ${reason}`)
              .setTimestamp();
            await targetUser.send({ embeds: [dmEmbed] }).catch(() => null);

            // Apply Kick
            await targetMember.kick(`Kicked by ${interaction.user.tag}: ${reason}`);

            // Log
            const kickLogChannelId = config.kickChannelId || config.logChannelId;
            if (kickLogChannelId) {
              const logChannel = await interaction.guild.channels.fetch(kickLogChannelId).catch(() => null);
              if (logChannel) {
                const logEmbed = new EmbedBuilder()
                  .setTitle('🦶 Member Kicked')
                  .setColor(0xEF4444)
                  .addFields(
                    { name: '👤 Target', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
                    { name: '👮 Moderator', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '📋 Reason', value: `\`\`\`${reason}\`\`\`` }
                  )
                  .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] }).catch(() => null);
              }
            }

            await logger.warning(client, '🦶 Member Kicked', [
              { name: 'Target', value: `${targetUser.tag} (\`${targetUser.id}\`)` },
              { name: 'Moderator', value: `${interaction.user.tag}` },
              { name: 'Reason', value: reason }
            ]);

            await interaction.followUp({
              embeds: [embedGenerator.success(`Kicked **${targetUser.tag}**.\nReason: \`${reason}\``)],
              ephemeral: true
            });

            // Update panel (force update targetMember to null since kicked)
            const updatedPanel = generatePanel(guildId, targetUser, null, isBanned);
            await interaction.editReply(updatedPanel);
          } catch (err) {
            console.error('[WARN KICK ERROR]', err);
            await interaction.followUp({
              embeds: [embedGenerator.error(`Failed to kick member: ${err.message}`)],
              ephemeral: true
            });
          }
        }
      }

      // Handle Unban click
      else if (customId === 'warn_btn_unban') {
        const modal = new ModalBuilder()
          .setCustomId('warn_modal_unban')
          .setTitle(`Unban ${targetUser.username}`);

        const reasonInput = new TextInputBuilder()
          .setCustomId('reason')
          .setLabel('Reason for unban')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(512)
          .setPlaceholder('Enter the unban reason...');

        const row = new ActionRowBuilder().addComponents(reasonInput);
        modal.addComponents(row);

        await btnInteraction.showModal(modal);

        const submitted = await btnInteraction.awaitModalSubmit({
          filter: i => i.customId === 'warn_modal_unban' && i.user.id === interaction.user.id,
          time: 60000
        }).catch(() => null);

        if (submitted) {
          await submitted.deferUpdate();
          const reason = submitted.fields.getTextInputValue('reason');

          try {
            await interaction.guild.members.unban(targetUser.id, `Unbanned by ${interaction.user.tag}: ${reason}`);

            await logger.success(client, '🔓 Member Unbanned', [
              { name: 'Target', value: `${targetUser.tag} (\`${targetUser.id}\`)` },
              { name: 'Moderator', value: `${interaction.user.tag}` },
              { name: 'Reason', value: reason }
            ]);

            await interaction.followUp({
              embeds: [embedGenerator.success(`Unbanned **${targetUser.tag}**.\nReason: \`${reason}\``)],
              ephemeral: true
            });

            // Update panel
            const updatedPanel = generatePanel(guildId, targetUser, targetMember, false);
            await interaction.editReply(updatedPanel);
          } catch (err) {
            console.error('[WARN UNBAN ERROR]', err);
            await interaction.followUp({
              embeds: [embedGenerator.error(`Failed to unban member: ${err.message}`)],
              ephemeral: true
            });
          }
        }
      }

      // Handle Ban click
      else if (customId === 'warn_btn_ban') {
        const modal = new ModalBuilder()
          .setCustomId('warn_modal_ban')
          .setTitle(`Ban ${targetUser.username}`);

        const reasonInput = new TextInputBuilder()
          .setCustomId('reason')
          .setLabel('Reason for ban')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(512)
          .setPlaceholder('Enter the ban reason...');

        const row = new ActionRowBuilder().addComponents(reasonInput);
        modal.addComponents(row);

        await btnInteraction.showModal(modal);

        const submitted = await btnInteraction.awaitModalSubmit({
          filter: i => i.customId === 'warn_modal_ban' && i.user.id === interaction.user.id,
          time: 60000
        }).catch(() => null);

        if (submitted) {
          await submitted.deferUpdate();
          const reason = submitted.fields.getTextInputValue('reason');

          // Check hierarchy if still in guild
          if (targetMember) {
            if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
              return interaction.followUp({
                embeds: [embedGenerator.error('You cannot ban a member with equal or higher roles.')],
                ephemeral: true
              });
            }

            if (!targetMember.bannable) {
              return interaction.followUp({
                embeds: [embedGenerator.error('I cannot ban this member. Check my role position.')],
                ephemeral: true
              });
            }
          }

          try {
            // DM first
            const dmEmbed = new EmbedBuilder()
              .setTitle('🔨 You Have Been Banned')
              .setColor(0xEF4444)
              .setDescription(`You have been banned from **${interaction.guild.name}**.\n\n>>> 📋 **Reason:** ${reason}`)
              .setTimestamp();
            await targetUser.send({ embeds: [dmEmbed] }).catch(() => null);

            // Apply Ban
            await interaction.guild.members.ban(targetUser.id, {
              reason: `Banned by ${interaction.user.tag}: ${reason}`
            });

            // Log public ban if configured
            const announcementChannelId = config.banAnnouncementChannelId;
            if (announcementChannelId) {
              const announcementChannel = await interaction.guild.channels.fetch(announcementChannelId).catch(() => null);
              if (announcementChannel) {
                const announcementEmbed = new EmbedBuilder()
                  .setTitle('⛔ Member Banned')
                  .setColor(0xEF4444)
                  .setDescription(`> 🚨 **${targetUser.tag}** has been banned from **${interaction.guild.name}**.\n\n📋 **Reason:**\n\`\`\`${reason}\`\`\``)
                  .addFields(
                    { name: '👤 Member', value: `<@${targetUser.id}>`, inline: true },
                    { name: '👮 Banned By', value: `<@${interaction.user.id}>`, inline: true }
                  )
                  .setTimestamp();
                await announcementChannel.send({
                  content: `@everyone ⚠️ **${targetUser.tag}** has been banned.\n📋 **Reason:** ${reason}`,
                  embeds: [announcementEmbed],
                  allowedMentions: { parse: ['everyone'] }
                }).catch(() => null);
              }
            }

            await logger.warning(client, '⛔ Member Banned', [
              { name: 'Target', value: `${targetUser.tag} (\`${targetUser.id}\`)` },
              { name: 'Moderator', value: `${interaction.user.tag}` },
              { name: 'Reason', value: reason }
            ]);

            await interaction.followUp({
              embeds: [embedGenerator.success(`Banned **${targetUser.tag}**.\nReason: \`${reason}\``)],
              ephemeral: true
            });

            // Update panel (force update targetMember to null since banned)
            const updatedPanel = generatePanel(guildId, targetUser, null, true);
            await interaction.editReply(updatedPanel);
          } catch (err) {
            console.error('[WARN BAN ERROR]', err);
            await interaction.followUp({
              embeds: [embedGenerator.error(`Failed to ban member: ${err.message}`)],
              ephemeral: true
            });
          }
        }
      }
    });

    collector.on('end', async () => {
      // Disable all buttons when session ends to prevent double clicks
      try {
        const disabledRows = panelData.components.map(row => {
          const disabledRow = new ActionRowBuilder();
          row.components.forEach(button => {
            disabledRow.addComponents(ButtonBuilder.from(button).setDisabled(true));
          });
          return disabledRow;
        });

        await interaction.editReply({ components: disabledRows }).catch(() => null);
      } catch (err) {
        // Ignore errors from message being deleted
      }
    });
  }
};

// Helper duration parser function
function parseDuration(str) {
  const match = str.match(/^(\d+)([smhdw])$/i);
  if (!match) return null;
  const val = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case 's': return val * 1000;
    case 'm': return val * 60 * 1000;
    case 'h': return val * 60 * 60 * 1000;
    case 'd': return val * 24 * 60 * 60 * 1000;
    case 'w': return val * 7 * 24 * 60 * 60 * 1000;
    default: return null;
  }
}
