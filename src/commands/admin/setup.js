const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const config = require('../../config');
const tempVoiceManager = require('../../managers/tempVoice');
const restrictionManager = require('../../managers/restriction');
const settingsManager = require('../../utils/settingsManager');
const embedGenerator = require('../../utils/embedGenerator');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure temporary voice and logging settings, or view system diagnostics.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(opt =>
      opt.setName('temp_category')
         .setDescription('The category under which temporary rooms will be created.')
         .addChannelTypes(ChannelType.GuildCategory)
         .setRequired(false)
    )
    .addChannelOption(opt =>
      opt.setName('logs_channel')
         .setDescription('The text channel where bot auditing logs will be sent.')
         .addChannelTypes(ChannelType.GuildText)
         .setRequired(false)
    )
    .addChannelOption(opt =>
      opt.setName('trigger_channel')
         .setDescription('The "Join to Create" voice channel. If omitted and category is selected, bot auto-creates one.')
         .addChannelTypes(ChannelType.GuildVoice)
         .setRequired(false)
    )
    .addChannelOption(opt =>
      opt.setName('leave_channel')
         .setDescription('The text channel where member leave farewell messages will be sent.')
         .addChannelTypes(ChannelType.GuildText)
         .setRequired(false)
    )
    .addChannelOption(opt =>
      opt.setName('ban_channel')
         .setDescription('The text channel where public ban announcements will be posted.')
         .addChannelTypes(ChannelType.GuildText)
         .setRequired(false)
    )
    .addChannelOption(opt =>
      opt.setName('kick_channel')
         .setDescription('The text channel where public kick announcements will be posted.')
         .addChannelTypes(ChannelType.GuildText)
         .setRequired(false)
    )
    .addChannelOption(opt =>
      opt.setName('timeout_channel')
         .setDescription('The text channel where public timeout announcements will be posted.')
         .addChannelTypes(ChannelType.GuildText)
         .setRequired(false)
    )
    .addChannelOption(opt =>
      opt.setName('warn_channel')
         .setDescription('The text channel where public warn announcements will be posted.')
         .addChannelTypes(ChannelType.GuildText)
         .setRequired(false)
    )
    .addChannelOption(opt =>
      opt.setName('panelrolegaming')
         .setDescription('The text channel to send the Gaming Role Panel to.')
         .addChannelTypes(ChannelType.GuildText)
         .setRequired(false)
    )
    .addChannelOption(opt =>
      opt.setName('mrwhite_channel')
         .setDescription('The text channel where Mr. White game results & leaderboard are posted after every match.')
         .addChannelTypes(ChannelType.GuildText)
         .setRequired(false)
    ),

  async execute(client, interaction) {
    const tempCategory = interaction.options.getChannel('temp_category');
    const logsChannel = interaction.options.getChannel('logs_channel');
    const triggerChannel = interaction.options.getChannel('trigger_channel');
    const leaveChannel = interaction.options.getChannel('leave_channel');
    const banChannel = interaction.options.getChannel('ban_channel');
    const kickChannel = interaction.options.getChannel('kick_channel');
    const timeoutChannel = interaction.options.getChannel('timeout_channel');
    const warnChannel = interaction.options.getChannel('warn_channel');
    const panelRoleGaming = interaction.options.getChannel('panelrolegaming');
    const mrWhiteChannel = interaction.options.getChannel('mrwhite_channel');

    // =======================================================
    // CASE 1: DIAGNOSTIC VIEW (No options provided)
    // =======================================================
    if (!tempCategory && !logsChannel && !triggerChannel && !leaveChannel && !banChannel && !kickChannel && !timeoutChannel && !warnChannel && !panelRoleGaming && !mrWhiteChannel) {
      await interaction.deferReply({ ephemeral: true });

      const activeRooms = tempVoiceManager.getAllRooms().length;
      const blockedUsersCount = restrictionManager.getBlockedUsers().length;
      const blockedRolesCount = restrictionManager.getBlockedRoles().length;

      const triggerChannelCheck = config.triggerChannelId && config.triggerChannelId !== 'YOUR_CREATE_VOICE_CHANNEL_ID_HERE'
        ? `<#${config.triggerChannelId}> (\`${config.triggerChannelId}\`)`
        : '❌ Not Configured';

      const categoryCheck = config.tempCategoryId && config.tempCategoryId !== 'YOUR_CATEGORY_ID_HERE'
        ? `<#${config.tempCategoryId}> (\`${config.tempCategoryId}\`)`
        : '❌ Not Configured';

      const logChannelCheck = config.logChannelId && config.logChannelId !== 'YOUR_LOG_CHANNEL_ID_HERE'
        ? `<#${config.logChannelId}> (\`${config.logChannelId}\`)`
        : '❌ Not Configured (Server logs will only output to console)';

      const leaveChannelCheck = config.leaveChannelId
        ? `<#${config.leaveChannelId}> (\`${config.leaveChannelId}\`)`
        : '❌ Not Configured';

      const banChannelCheck = config.banAnnouncementChannelId
        ? `<#${config.banAnnouncementChannelId}> (\`${config.banAnnouncementChannelId}\`)`
        : '❌ Not Configured';

      const kickChannelCheck = config.kickChannelId
        ? `<#${config.kickChannelId}> (\`${config.kickChannelId}\`)`
        : '❌ Not Configured';

      const timeoutChannelCheck = config.timeoutChannelId
        ? `<#${config.timeoutChannelId}> (\`${config.timeoutChannelId}\`)`
        : '❌ Not Configured';

      const warnChannelCheck = config.warnChannelId
        ? `<#${config.warnChannelId}> (\`${config.warnChannelId}\`)`
        : '❌ Not Configured';

      const panelRoleGamingCheck = config.gameRolePanelChannelId
        ? `<#${config.gameRolePanelChannelId}> (\`${config.gameRolePanelChannelId}\`)`
        : '❌ Not Configured';

      const mrWhiteStatsCheck = config.mrWhiteStatsChannelId
        ? `<#${config.mrWhiteStatsChannelId}> (\`${config.mrWhiteStatsChannelId}\`)`
        : '❌ Not Configured';

      const embed = embedGenerator.info(
        `Here is a full diagnostic overview of the bot settings currently loaded in memory.\n\n` +
        `**🛠️ Active Settings Overview:**\n` +
        `• **Create Trigger Voice:** ${triggerChannelCheck}\n` +
        `• **Spawn Category Parent:** ${categoryCheck}\n` +
        `• **Advanced Logs Channel:** ${logChannelCheck}\n` +
        `• **Member Leave Channel:** ${leaveChannelCheck}\n` +
        `• **Ban Channel:** ${banChannelCheck}\n` +
        `• **Kick Channel:** ${kickChannelCheck}\n` +
        `• **Timeout Channel:** ${timeoutChannelCheck}\n` +
        `• **Warn Channel:** ${warnChannelCheck}\n` +
        `• **Gaming Role Panel:** ${panelRoleGamingCheck}\n` +
        `• **Mr. White Stats Channel:** ${mrWhiteStatsCheck}\n\n` +
        `**📊 Current Runtime Caches:**\n` +
        `• **Active Temp Rooms:** \`${activeRooms}\` active sessions\n` +
        `• **Globally Restricted Users:** \`${blockedUsersCount}\` blocked\n` +
        `• **Globally Restricted Roles:** \`${blockedRolesCount}\` blocked\n\n` +
        `**💡 Dynamic Command Configuration:**\n` +
        `You can easily reconfigure any setting by typing \`/setup\` and selecting the options!`,
        '🛠️ Bot Setup Diagnostics'
      );

      return interaction.editReply({ embeds: [embed] });
    }

    // =======================================================
    // CASE 2: CONFIGURATION ACTION (Options provided)
    // =======================================================
    await interaction.deferReply({ ephemeral: true });

    const newSettings = {};
    const logDetails = [];

    // A: Handle Logs Channel
    if (logsChannel) {
      newSettings.logChannelId = logsChannel.id;
      logDetails.push(`• **Logs Channel**: Set to <#${logsChannel.id}> (\`${logsChannel.id}\`)`);
    }

    // B: Handle Category Channel
    if (tempCategory) {
      newSettings.tempCategoryId = tempCategory.id;
      logDetails.push(`• **Spawn Category**: Set to <#${tempCategory.id}> (\`${tempCategory.id}\`)`);
    }

    // C: Handle Trigger Voice Channel
    if (triggerChannel) {
      newSettings.triggerChannelId = triggerChannel.id;
      logDetails.push(`• **Trigger Channel**: Set to <#${triggerChannel.id}> (\`${triggerChannel.id}\`)`);
    }
    // D: If category was provided but no voice trigger, automatically create trigger
    else if (tempCategory) {
      const guild = interaction.guild;
      const existingChannel = guild.channels.cache.find(
        ch => ch.type === ChannelType.GuildVoice && ch.parentId === tempCategory.id && ch.name === '🎧・𝐉𝐨𝐢𝐧 𝐓𝐨 𝐂𝐫𝐞𝐚𝐭𝐞'
      );

      if (existingChannel) {
        newSettings.triggerChannelId = existingChannel.id;
        logDetails.push(`• **Trigger Channel**: Found existing <#${existingChannel.id}> inside selected category.`);
      } else {
        const newTrigger = await interaction.guild.channels.create({
          name: '🎧・𝐉𝐨𝐢𝐧 𝐓𝐨 𝐂𝐫𝐞𝐚𝐭𝐞',
          type: ChannelType.GuildVoice,
          parent: tempCategory.id
        });
        newSettings.triggerChannelId = newTrigger.id;
        logDetails.push(`• **Trigger Channel**: Auto-created <#${newTrigger.id}> under your category.`);
      }
    }

    // E: Handle Leave Channel
    if (leaveChannel) {
      newSettings.leaveChannelId = leaveChannel.id;
      logDetails.push(`• **Leave Channel**: Set to <#${leaveChannel.id}> (\`${leaveChannel.id}\`)`);
    }

    // F: Handle Ban Announcement Channel
    if (banChannel) {
      newSettings.banAnnouncementChannelId = banChannel.id;
      logDetails.push(`• **Ban Channel**: Set to <#${banChannel.id}> (\`${banChannel.id}\`)`);
    }

    // G: Handle Kick Announcement Channel
    if (kickChannel) {
      newSettings.kickChannelId = kickChannel.id;
      logDetails.push(`• **Kick Channel**: Set to <#${kickChannel.id}> (\`${kickChannel.id}\`)`);
    }

    // H: Handle Timeout Announcement Channel
    if (timeoutChannel) {
      newSettings.timeoutChannelId = timeoutChannel.id;
      logDetails.push(`• **Timeout Channel**: Set to <#${timeoutChannel.id}> (\`${timeoutChannel.id}\`)`);
    }

    // I: Handle Warn Announcement Channel
    if (warnChannel) {
      newSettings.warnChannelId = warnChannel.id;
      logDetails.push(`• **Warn Channel**: Set to <#${warnChannel.id}> (\`${warnChannel.id}\`)`);
    }

    // J: Handle Gaming Role Panel
    if (panelRoleGaming) {
      try {
        const panelrolegamingCmd = require('./panelrolegaming');
        const panelEmbed = panelrolegamingCmd.buildPanelEmbed(interaction.guild);
        const rows = panelrolegamingCmd.buildGameRows();

        await panelRoleGaming.send({ embeds: [panelEmbed], components: rows });

        newSettings.gameRolePanelChannelId = panelRoleGaming.id;
        logDetails.push(`• **Gaming Role Panel**: Sent & configured in <#${panelRoleGaming.id}> (\`${panelRoleGaming.id}\`)`);
      } catch (err) {
        console.error('[SETUP] Failed to deploy gaming role panel:', err);
        logDetails.push(`• **Gaming Role Panel**: ❌ Failed to deploy to <#${panelRoleGaming.id}>`);
      }
    }

    // K: Handle Mr. White Stats Channel
    if (mrWhiteChannel) {
      newSettings.mrWhiteStatsChannelId = mrWhiteChannel.id;
      logDetails.push(`• **Mr. White Stats Channel**: Set to <#${mrWhiteChannel.id}> (\`${mrWhiteChannel.id}\`)`);
    }

    // Save and commit changes in local JSON and active memory
    const success = settingsManager.saveSettings(newSettings);

    if (success) {
      const summaryEmbed = embedGenerator.success(
        `**Successfully updated bot settings in persistent storage and bot memory!**\n\n` +
        `**⚙️ Applied Configurations:**\n` +
        logDetails.join('\n') + `\n\n` +
        `**💡 System Sync Info:**\n` +
        `• These selections are fully persistent and will survive bot restarts.\n` +
        `• Setup is hot-swappable—the bot uses these new rules immediately!`,
        '✅ Setup Configurations Applied'
      );

      await interaction.editReply({ embeds: [summaryEmbed] });

      // Audit Log the setup change
      await logger.success(client, '⚙️ Bot Setup Reconfigured', [
        { name: 'Administrator', value: `<@${interaction.user.id}>` },
        { name: 'Updated Settings', value: logDetails.map(d => d.replace(/• \*\*/g, '').replace(/\*\*/g, '')).join('\n') }
      ]);
    } else {
      const errEmbed = embedGenerator.error('Failed to commit setup configurations to local JSON storage.');
      await interaction.editReply({ embeds: [errEmbed] });
    }
  }
};
