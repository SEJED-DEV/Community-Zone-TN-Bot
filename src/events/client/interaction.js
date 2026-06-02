const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder, UserSelectMenuBuilder, MentionableSelectMenuBuilder, EmbedBuilder, PermissionFlagsBits, ButtonBuilder, ButtonStyle } = require('discord.js');
const tempVoiceManager = require('../../managers/tempVoice');
const restrictionManager = require('../../managers/restriction');
const dashboardGenerator = require('../../utils/dashboard');
const embedGenerator = require('../../utils/embedGenerator');
const logger = require('../../utils/logger');
const config = require('../../config');
const musicManager = require('../../managers/musicManager');
const emojiHelper = require('../../utils/nicknameEmojiHelper');
const levelingManager = require('../../managers/levelingManager');
const { GAMES: GAME_LIST } = require('../../commands/admin/panelrolegaming');
const mrWhiteManager = require('../../managers/mrWhiteManager');
const confessManager = require('../../managers/confessManager');

// Global map to track active Rock-Paper-Scissors games
const activeRpsGames = new Map();

/**
 * Synchronizes the status embed across both the private text channel
 * and the voice channel built-in text chat dashboard.
 */
async function syncDashboards(guild, room, voiceChannel, textChannel, ownerMember) {
  // Always re-fetch the voice channel to get the latest userLimit and member count from Discord
  const freshVoiceChannel = await guild.channels.fetch(room.voiceId).catch(() => voiceChannel);
  const embed = dashboardGenerator.generateEmbed(ownerMember, freshVoiceChannel || voiceChannel, room);
  const components = dashboardGenerator.generateButtons();

  if (textChannel && room.dashboardMessageId) {
    const msg = await textChannel.messages.fetch(room.dashboardMessageId).catch(() => null);
    if (msg) await msg.edit({ embeds: [embed], components: components }).catch(() => null);
  }
  if ((freshVoiceChannel || voiceChannel) && room.voiceDashboardMessageId) {
    const vc = freshVoiceChannel || voiceChannel;
    const msg = await vc.messages.fetch(room.voiceDashboardMessageId).catch(() => null);
    if (msg) await msg.edit({ embeds: [embed], components: components }).catch(() => null);
  }
}

/**
 * Resolves a User object from a string input that can be:
 * 1. A Mention (<@123456789>)
 * 2. A raw User ID (18 digits)
 * 3. A Username, Display Name, or Nickname (case-insensitive, exact/partial matching)
 */
async function resolveUser(guild, input) {
  if (!input) return null;
  input = input.trim();

  // 1. Check if it's a Mention <@!123456789> or <@123456789>
  const mentionMatch = input.match(/^<@!?(\d+)>/);
  if (mentionMatch) {
    const id = mentionMatch[1];
    try {
      return await guild.client.users.fetch(id);
    } catch {
      return null;
    }
  }

  // 2. Check if it's a raw User ID
  if (/^\d{17,19}$/.test(input)) {
    try {
      return await guild.client.users.fetch(input);
    } catch {
      // Fall through to search if fetch fails
    }
  }

  // Clean the input of leading '@' for text-based matching
  const cleanInput = input.replace(/^@/, '');
  if (!cleanInput) return null;

  const query = cleanInput.toLowerCase();

  // Fetch using Discord API query search (highly performant and matches nicknames/usernames fuzzy/pseudo)
  const apiFetched = await guild.members.fetch({ query: cleanInput, limit: 25 }).catch(() => new Map());

  // Merge the API results and local cache
  const candidates = new Map();
  apiFetched.forEach(m => candidates.set(m.id, m));

  guild.members.cache.forEach(m => {
    const username = m.user.username.toLowerCase();
    const tag = m.user.tag.toLowerCase();
    const nickname = m.nickname ? m.nickname.toLowerCase() : '';
    const globalName = m.user.globalName ? m.user.globalName.toLowerCase() : '';
    const displayName = m.displayName ? m.displayName.toLowerCase() : '';

    if (
      username.includes(query) ||
      tag.includes(query) ||
      nickname.includes(query) ||
      globalName.includes(query) ||
      displayName.includes(query)
    ) {
      candidates.set(m.id, m);
    }
  });

  // Score candidates: exact matches get priority
  let exactMatches = [];
  let partialMatches = [];

  candidates.forEach(m => {
    const username = m.user.username.toLowerCase();
    const tag = m.user.tag.toLowerCase();
    const nickname = m.nickname ? m.nickname.toLowerCase() : '';
    const globalName = m.user.globalName ? m.user.globalName.toLowerCase() : '';
    const displayName = m.displayName ? m.displayName.toLowerCase() : '';

    if (
      username === query ||
      tag === query ||
      nickname === query ||
      globalName === query ||
      displayName === query
    ) {
      exactMatches.push(m.user);
    } else {
      partialMatches.push(m.user);
    }
  });

  if (exactMatches.length === 1) {
    return exactMatches[0];
  }

  if (exactMatches.length > 1) {
    const list = exactMatches.map(u => `• **${u.tag}** (\`${u.id}\`)`).slice(0, 10).join('\n');
    throw new Error(`Multiple exact matching members found:\n${list}\n\n*Please specify the user ID or copy their full tag.*`);
  }

  if (partialMatches.length === 1) {
    return partialMatches[0];
  }

  if (partialMatches.length > 1) {
    const list = partialMatches.map(u => `• **${u.tag}** (\`${u.id}\`)`).slice(0, 10).join('\n');
    throw new Error(`Multiple matching members found:\n${list}\n\n*Please type a more specific name or copy their ID.*`);
  }

  // Fallback: check general user cache
  const cachedUser = guild.client.users.cache.find(u => 
    u.username.toLowerCase() === query || 
    u.tag.toLowerCase() === query
  );
  if (cachedUser) return cachedUser;

  return null;
}

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(client, interaction) {
    // ==========================================
    // 1. SLASH COMMANDS ROUTING
    // ==========================================
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      // Global restriction check for slash commands
      if (restrictionManager.isMemberBlocked(interaction.member)) {
        const blockEmbed = embedGenerator.error(
          '⛔ You are globally blocked from using this bot\'s systems.',
          'Access Blocked'
        );
        return interaction.reply({ embeds: [blockEmbed], ephemeral: true });
      }

      try {
        await command.execute(client, interaction);
      } catch (error) {
        console.error(`[COMMAND ERROR] Failed executing /${interaction.commandName}:`, error);
        const errEmbed = embedGenerator.error('An internal system error occurred while running this command.');
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ embeds: [errEmbed], ephemeral: true }).catch(() => null);
        } else {
          await interaction.reply({ embeds: [errEmbed], ephemeral: true }).catch(() => null);
        }
      }
      return;
    }

    // ==========================================
    // 2. DASHBOARD SYSTEM ROUTING (BUTTONS, SELECT MENUS, MODALS)
    // ==========================================
    const customId = interaction.customId;
    if (!customId) return;

    // ==========================================
    // ECONOMY & CASINO INTERACTION INTERCEPT
    // ==========================================
    if (customId.startsWith('shop_') || customId.startsWith('casino_')) {
      const economyHandlers = require('../../utils/economyHandlers');
      return economyHandlers.handleInteraction(client, interaction);
    }

    // ==========================================
    // MR. WHITE GAME SYSTEM ROUTING (BUTTONS)
    // ==========================================
    if (interaction.isButton() && customId.startsWith('mw_')) {
      const guildId = interaction.guildId;

      // Handle Panel Lobby Creation
      if (customId === 'mw_create_game_lobby') {
        const command = client.commands.get('mrwhite');
        if (command) {
          // Fake interaction options to trigger 'play' subcommand
          interaction.options.getSubcommand = () => 'play';
          return command.execute(client, interaction);
        }
      }
      const game = mrWhiteManager.getGame(guildId);

      // Handle Join / Leave before checking for game existence since they create the context
      if (customId === 'mw_player_join') {
        if (!game) {
          return interaction.reply({ content: '❌ لا توجد لعبة نشطة حالياً في هذا السيرفر.', ephemeral: true });
        }
        if (game.status !== 'LOBBY') {
          return interaction.reply({ content: '❌ لقد بدأت المباراة بالفعل ولا يمكن الانضمام الآن!', ephemeral: true });
        }
        if (game.players.has(interaction.user.id)) {
          return interaction.reply({ content: '⚠️ أنت منضم بالفعل في هذه المباراة!', ephemeral: true });
        }
        if (game.players.size >= 15) {
          return interaction.reply({ content: '❌ الغرفة ممتلئة بالكامل! (الحد الأقصى 15 لاعباً).', ephemeral: true });
        }

        // Voice channel check
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== game.voiceChannelId) {
          return interaction.reply({ content: `⚠️ يجب أن تكون متصلاً بالروم الصوتي للعبة <#${game.voiceChannelId}> لتتمكن من الانضمام!`, ephemeral: true });
        }

        game.players.set(interaction.user.id, {
          userId: interaction.user.id,
          tag: interaction.user.tag,
          role: 'CITIZEN',
          active: true,
          viewed: false
        });

        await interaction.deferUpdate();
        await mrWhiteManager.updateGameMessage(client, guildId);
        return;
      }

      if (customId === 'mw_player_leave') {
        if (!game) {
          return interaction.reply({ content: '❌ لا توجد لعبة نشطة حالياً في هذا السيرفر.', ephemeral: true });
        }
        if (game.status !== 'LOBBY') {
          return interaction.reply({ content: '❌ لا يمكنك الخروج بعد بدء المباراة!', ephemeral: true });
        }
        if (!game.players.has(interaction.user.id)) {
          return interaction.reply({ content: '⚠️ أنت لست منضماً في هذه المباراة أساساً!', ephemeral: true });
        }

        game.players.delete(interaction.user.id);
        await interaction.deferUpdate();
        await mrWhiteManager.updateGameMessage(client, guildId);
        return;
      }

      // Check game context for all other buttons
      if (!game) {
        return interaction.reply({ content: '❌ لا توجد لعبة نشطة حالياً في هذا السيرفر.', ephemeral: true });
      }

      // 👑 HOST ONLY CONTROLS
      if (customId.startsWith('mw_host_')) {
        if (game.hostId !== interaction.user.id) {
          return interaction.reply({ content: '❌ هذا الزر مخصص لمضيف اللعبة (Host) فقط!', ephemeral: true });
        }

        await interaction.deferUpdate();

        if (customId === 'mw_host_open_join') {
          game.status = 'LOBBY';
          await mrWhiteManager.updateGameMessage(client, guildId);
        }
        else if (customId === 'mw_host_close_join') {
          if (game.players.size < 4) {
            return interaction.followUp({ content: '⚠️ لا يمكن إغلاق الانضمام لأن عدد اللاعبين أقل من 4 لاعبين!', ephemeral: true });
          }
          // lock join
          const closeEmbed = mrWhiteManager.getLobbyEmbed(game)
            .setTitle('🎮 لعبة Mr. White — تم إغلاق الانضمام')
            .setDescription(`🔒 تم إغلاق باب الانضمام بواسطة المضيف. بانتظار بدء المباراة!\n\n👑 **المضيف:** <@${game.hostId}>\n👥 **العدد النهائي:** \`${game.players.size} لاعبين\``);
          
          const hostButtons = mrWhiteManager.getHostButtons(game);
          const channel = await client.channels.fetch(game.textChannelId).catch(() => null);
          if (channel && game.gameMessageId) {
            const msg = await channel.messages.fetch(game.gameMessageId).catch(() => null);
            if (msg) {
              await msg.edit({ embeds: [closeEmbed], components: [hostButtons] }).catch(() => null);
            }
          }
        }
        else if (customId === 'mw_host_start_game') {
          if (game.players.size < 4) {
            return interaction.followUp({ content: '❌ الحد الأدنى لبدء المباراة هو 4 لاعبين!', ephemeral: true });
          }
          await mrWhiteManager.startGame(client, guildId);
        }
        else if (customId === 'mw_host_end_game') {
          // Unmute everyone
          const guild = interaction.guild;
          const allIds = Array.from(game.players.values()).map(p => p.userId);
          await mrWhiteManager.setMultipleMutes(guild, allIds, false);

          const endEmbed = new EmbedBuilder()
            .setColor(0xEF4444)
            .setTitle('⏹️ تم إنهاء المباراة')
            .setDescription(`⚠️ تم إلغاء وإنهاء مباراة **Mr. White Voice Edition** بالكامل بواسطة مضيف اللعبة <@${game.hostId}>.`)
            .setTimestamp();

          const channel = await client.channels.fetch(game.textChannelId).catch(() => null);
          if (channel && game.gameMessageId) {
            const msg = await channel.messages.fetch(game.gameMessageId).catch(() => null);
            if (msg) {
              await msg.edit({ embeds: [endEmbed], components: [] }).catch(() => null);
            }
          }

          mrWhiteManager.deleteGame(guildId);
        }
        else if (customId === 'mw_host_start_first_round') {
          await mrWhiteManager.startRound(client, guildId, 1);
        }
        else if (customId === 'mw_host_force_discussion') {
          await mrWhiteManager.startVoting(client, guildId);
        }
        else if (customId === 'mw_host_force_vote') {
          await mrWhiteManager.resolveVote(client, guildId);
        }
        else if (customId === 'mw_host_force_next_turn') {
          await mrWhiteManager.nextTurn(client, guildId);
        }
        else if (customId === 'mw_host_resolve_citizen_win') {
          await mrWhiteManager.resolveGuess(client, guildId, false);
        }
        else if (customId === 'mw_host_resolve_white_win') {
          await mrWhiteManager.resolveGuess(client, guildId, true);
        }
        return;
      }

      // 👥 GENERAL PLAYER ACTIONS
      if (customId === 'mw_player_view_role') {
        const text = await mrWhiteManager.viewRole(client, guildId, interaction.user.id);
        if (!text) {
          return interaction.reply({ content: '⚠️ أنت لست جزءاً من هذه المباراة، أو تم كشف دورك بالفعل!', ephemeral: true });
        }
        return interaction.reply({ content: text, ephemeral: true });
      }

      if (customId === 'mw_player_skip_turn') {
        const success = await mrWhiteManager.skipTurn(client, guildId, interaction.user.id);
        if (!success) {
          return interaction.reply({ content: '⚠️ ليس دورك حالياً لتتمكن من التخطي!', ephemeral: true });
        }
        return interaction.reply({ content: '⏭️ تم تخطي دورك بنجاح.', ephemeral: true });
      }

      if (customId === 'mw_player_vote_end_discussion') {
        const success = await mrWhiteManager.voteEndDiscussion(client, guildId, interaction.user.id);
        if (!success) {
          return interaction.reply({ content: '⚠️ لا يمكنك التصويت لإنهاء النقاش (قد تكون مقصياً أو اللعبة ليست في مرحلة النقاش).', ephemeral: true });
        }
        return interaction.reply({ content: '🔊 تم تسجيل صوتك لإنهاء النقاش الحر.', ephemeral: true });
      }

      // 🎯 VOTING ACTIONS
      if (customId.startsWith('mw_vote_target_')) {
        const targetUserId = customId.replace('mw_vote_target_', '');
        const success = await mrWhiteManager.submitVote(client, guildId, interaction.user.id, targetUserId);
        if (!success) {
          return interaction.reply({ content: '⚠️ لا يمكنك التصويت حالياً (قد تكون مقصياً أو اللعبة ليست في مرحلة التصويت).', ephemeral: true });
        }
        return interaction.reply({ content: `🎯 تم تسجيل تصويتك بنجاح ضد اللاعب <@${targetUserId}>. لا يمكنك تغيير تصويتك!`, ephemeral: true });
      }

      if (customId === 'mw_vote_skip') {
        const success = await mrWhiteManager.submitVote(client, guildId, interaction.user.id, 'SKIP');
        if (!success) {
          return interaction.reply({ content: '⚠️ لا يمكنك التصويت حالياً.', ephemeral: true });
        }
        return interaction.reply({ content: '⏭️ تم تسجيل تصويتك لتخطي الإقصاء في هذه الجولة.', ephemeral: true });
      }

      return;
    }

    // ==========================================
    // NICKNAME PANEL — runs in any channel
    // ==========================================
    if (interaction.isButton() && customId === 'nickname_panel_btn') {
      const modal = new ModalBuilder()
        .setCustomId('nickname_modal_submit')
        .setTitle('🪪 Change Your Nickname');

      const nicknameInput = new TextInputBuilder()
        .setCustomId('nickname_input')
        .setLabel('New Nickname')
        .setPlaceholder('Enter your new server nickname...')
        .setStyle(TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(32)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(nicknameInput));
      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && customId === 'nickname_modal_submit') {
      const newNickname = interaction.fields.getTextInputValue('nickname_input').trim();

      try {
        await interaction.member.setNickname(newNickname, `Nickname changed via panel by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            {
              color: 0x10B981,
              title: '✅ Nickname Updated',
              description: `Your nickname has been set to **${newNickname}**.`,
              footer: { text: 'Community Zone • Dev by Akaza_senior' },
              timestamp: new Date().toISOString(),
            },
          ],
          ephemeral: true,
        });
      } catch (err) {
        return interaction.reply({
          embeds: [
            {
              color: 0xEF4444,
              title: '❌ Failed to Change Nickname',
              description:
                'Could not update your nickname. This may happen if:\n' +
                '• You are the **Server Owner** (Discord does not allow bots to change the owner\'s nickname).\n' +
                '• The bot\'s role is **below your role** in the hierarchy.',
              footer: { text: 'Community Zone • Dev by Akaza_senior' },
              timestamp: new Date().toISOString(),
            },
          ],
          ephemeral: true,
        });
      }
    }

    // ==========================================
    // SERVER TAG PANEL — Admin tag management
    // ==========================================
    if (interaction.isButton() && customId === 'tag_panel_set') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '⛔ Only administrators can change the server tag.', ephemeral: true });
      }
      const { getPrefix } = require('../../utils/prefixManager');
      const modal = new ModalBuilder()
        .setCustomId('tag_panel_modal_submit')
        .setTitle('🏷️ Set Server Tag');

      const tagInput = new TextInputBuilder()
        .setCustomId('tag_input')
        .setLabel('New Server Tag (e.g. 𝐂𝐙𝐓⚡ • )')
        .setPlaceholder(`Current: ${getPrefix()}`)
        .setStyle(TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(20)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(tagInput));
      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && customId === 'tag_panel_modal_submit') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '⛔ Only administrators can change the server tag.', ephemeral: true });
      }
      const { setPrefix, getPrefix } = require('../../utils/prefixManager');
      const newTag = interaction.fields.getTextInputValue('tag_input');
      setPrefix(newTag);

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x10B981)
          .setTitle('✅ Server Tag Updated!')
          .setDescription(`The server tag has been set to:\n\`\`\`${newTag}\`\`\`\n**Preview:** \`${newTag}username\`\n\nUse \`/applyprefixall\` to apply the new tag to all current members.`)
          .setFooter({ text: 'Community Zone • Tag Management' })
          .setTimestamp()
        ],
        ephemeral: true
      });
    }

    if (interaction.isButton() && customId === 'tag_panel_reset') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '⛔ Only administrators can reset the server tag.', ephemeral: true });
      }
      const { setPrefix, DEFAULT_PREFIX } = require('../../utils/prefixManager');
      setPrefix(DEFAULT_PREFIX);

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x6366F1)
          .setTitle('🔄 Server Tag Reset')
          .setDescription(`Tag reset to default:\n\`\`\`${DEFAULT_PREFIX}\`\`\`\nUse \`/applyprefixall\` to re-apply to all members.`)
          .setFooter({ text: 'Community Zone • Tag Management' })
          .setTimestamp()
        ],
        ephemeral: true
      });
    }

    if (interaction.isButton() && customId === 'tag_panel_disable') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '⛔ Only administrators can disable the server tag.', ephemeral: true });
      }
      const { setPrefix } = require('../../utils/prefixManager');
      setPrefix('');

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xEF4444)
          .setTitle('🚫 Server Tag Disabled')
          .setDescription('The server tag has been **disabled**. New members will no longer receive a prefix automatically.\n\nExisting members keep their current nicknames.')
          .setFooter({ text: 'Community Zone • Tag Management' })
          .setTimestamp()
        ],
        ephemeral: true
      });
    }

    if (interaction.isButton() && customId === 'tag_panel_apply_all') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '⛔ Only administrators can apply the tag to all members.', ephemeral: true });
      }
      await interaction.deferReply({ ephemeral: true });
      const { applyPrefix, getPrefix } = require('../../utils/prefixManager');
      const guild = interaction.guild;
      await guild.members.fetch();
      const members = guild.members.cache.filter(m => !m.user.bot && m.id !== guild.ownerId);
      let success = 0, skipped = 0, failed = 0;
      const currentTag = getPrefix();

      if (!currentTag) {
        return interaction.editReply({ content: '⚠️ Server tag is currently disabled. Set a tag first using **Change Server Tag**.' });
      }

      for (const [, member] of members) {
        try {
          await applyPrefix(member);
          await new Promise(r => setTimeout(r, 300));
          success++;
        } catch (err) {
          if (err.message?.includes('Missing Permissions')) skipped++;
          else failed++;
        }
      }

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0x10B981)
          .setTitle('✅ Tag Applied to All Members')
          .setDescription(`Tag \`${currentTag}\` has been applied to all members.`)
          .addFields(
            { name: '✅ Updated', value: `\`${success}\``, inline: true },
            { name: '⚠️ Skipped', value: `\`${skipped}\``, inline: true },
            { name: '❌ Failed', value: `\`${failed}\``, inline: true }
          )
          .setFooter({ text: 'Community Zone • Tag Management' })
          .setTimestamp()
        ]
      });
    }

    if (interaction.isButton() && customId === 'tag_panel_remove_all') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '⛔ Only administrators can remove tags from all members.', ephemeral: true });
      }
      await interaction.deferReply({ ephemeral: true });
      const { stripPrefix } = require('../../utils/prefixManager');
      const guild = interaction.guild;
      await guild.members.fetch();
      const members = guild.members.cache.filter(m => !m.user.bot && m.id !== guild.ownerId);
      let success = 0, skipped = 0, failed = 0;

      for (const [, member] of members) {
        try {
          if (!member.nickname) {
            skipped++;
            continue;
          }
          const cleanNick = stripPrefix(member.nickname);
          if (cleanNick !== member.nickname) {
            await member.setNickname(cleanNick || null, 'Server tag removal').catch(err => {
              if (err.message?.includes('Missing Permissions')) skipped++;
              else failed++;
            });
            await new Promise(r => setTimeout(r, 300));
            success++;
          } else {
            skipped++;
          }
        } catch (err) {
          if (err.message?.includes('Missing Permissions')) skipped++;
          else failed++;
        }
      }

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0xEF4444)
          .setTitle('🗑️ Tag Removed from All Members')
          .setDescription('The server tag has been stripped from all member nicknames.\n\n⚠️ The tag enforcement is still **active** — new members and nickname changes will still be tagged.\nTo fully disable, press **🚫 Disable Tag** as well.')
          .addFields(
            { name: '✅ Updated', value: `\`${success}\``, inline: true },
            { name: '⚠️ Skipped', value: `\`${skipped}\``, inline: true },
            { name: '❌ Failed', value: `\`${failed}\``, inline: true }
          )
          .setFooter({ text: 'Community Zone • Tag Management' })
          .setTimestamp()
        ]
      });
    }

    // ==========================================
    // GAMING ROLE PANEL — Self-assign game roles
    // ==========================================
    if (interaction.isButton() && customId.startsWith('game_role_')) {
      await interaction.deferReply({ ephemeral: true });

      const gameId = customId.replace('game_role_', '');
      const game = GAME_LIST.find(g => g.id === gameId);

      if (!game) {
        return interaction.editReply({ content: '❌ Unknown game role. Please contact an administrator.' });
      }

      const guild = interaction.guild;
      const member = interaction.member;
      const roleName = game.label.replace(/[𝐀-𝐙𝐚-𝐳]/gu, c => String.fromCharCode(c.codePointAt(0) - 0x1D400 + 65)).trim();

      try {
        // Fetch all roles from Discord API to guarantee 100% cache accuracy before checking/creating
        const roles = await guild.roles.fetch();
        const expectedRoleName = `${game.emoji} ${game.label}`;

        // Check if the role already exists
        let role = roles.find(r =>
          r.name === expectedRoleName ||
          r.name === game.label ||
          r.name.includes(game.label)
        );

        // Auto-create the role only if it doesn't exist
        if (!role) {
          role = await guild.roles.create({
            name: `${game.emoji} ${game.label}`,
            color: 0x8B5CF6,
            reason: `Auto-created by Gaming Role Panel for: ${game.label}`
          });
        }

        // Toggle: add if not have, remove if have
        if (member.roles.cache.has(role.id)) {
          await member.roles.remove(role, 'Gaming Role Panel: role removed by user');
          return interaction.editReply({
            embeds: [{
              color: 0xEF4444,
              title: `🔴 Role Removed | أُزيلت الرتبة`,
              description: `The role **${role.name}** has been **removed** from you.\nتمت **إزالة** رتبة **${role.name}** منك.`,
              footer: { text: 'Community Zone • Dev by Akaza_senior' },
              timestamp: new Date().toISOString()
            }]
          });
        } else {
          await member.roles.add(role, 'Gaming Role Panel: role assigned by user');
          return interaction.editReply({
            embeds: [{
              color: 0x10B981,
              title: `🟢 Role Assigned | أُضيفت الرتبة`,
              description: `The role **${role.name}** has been **assigned** to you!\nتمت **إضافة** رتبة **${role.name}** إليك!`,
              footer: { text: 'Community Zone • Dev by Akaza_senior' },
              timestamp: new Date().toISOString()
            }]
          });
        }
      } catch (err) {
        console.error(`[GAME ROLE PANEL] Error toggling role for ${member.user.tag}:`, err);
        return interaction.editReply({
          content: `❌ Failed to assign/remove the role. Please make sure the bot's role is above game roles in the server hierarchy.`
        });
      }
    }

    // ==========================================
    // ROCK-PAPER-SCISSORS GAME LOGIC
    // ==========================================

    // ── 1. Create Challenge button click ──
    if (interaction.isButton() && customId === 'rps_create_game') {
      const modal = new ModalBuilder()
        .setCustomId('rps_modal_create')
        .setTitle('⚔️ Create RPS Challenge | إنشاء تحدي');

      const betInput = new TextInputBuilder()
        .setCustomId('rps_bet_input')
        .setLabel('XP Bet Amount | قيمة الرهان (Min: 100)')
        .setPlaceholder('Enter the amount of XP to bet...')
        .setStyle(TextInputStyle.Short)
        .setMinLength(3)
        .setMaxLength(15)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(betInput));
      return interaction.showModal(modal);
    }

    // ── 2. Modal Submission ──
    if (interaction.isModalSubmit() && customId === 'rps_modal_create') {
      const betStr = interaction.fields.getTextInputValue('rps_bet_input').trim();
      const betAmount = parseInt(betStr, 10);

      if (isNaN(betAmount) || betAmount < 100) {
        return interaction.reply({
          content: '❌ Invalid bet amount! Min bet is `100 XP`. | قيمة الرهان غير صالحة! الحد الأدنى هو 100 نقطة.',
          ephemeral: true
        });
      }

      const guildId = interaction.guildId;
      const userId = interaction.user.id;
      const userXp = levelingManager.getUserData(guildId, userId)?.xp || 0;

      if (userXp < betAmount) {
        return interaction.reply({
          content: `❌ You do not have enough XP to make this bet! You currently have \`${userXp.toLocaleString()} XP\`. | ليس لديك نقاط كافية! لديك حالياً \`${userXp.toLocaleString()} XP\`.`,
          ephemeral: true
        });
      }

      // Create challenge invitation embed
      const challengeEmbed = new EmbedBuilder()
        .setColor(0xF59E0B)
        .setTitle('⚔️ Rock-Paper-Scissors Challenge | تحدي حجرة - ورقة - مقص')
        .setDescription(
          `⚔️ **${interaction.user}** has created a challenge and bet **\`${betAmount.toLocaleString()} XP\`**!\n\n` +
          `🏆 **المتحدي:** ${interaction.user}\n` +
          `💰 **قيمة الرهان:** \`${betAmount.toLocaleString()} XP\`\n\n` +
          `Click the button below to join the match and match the bet!`
        )
        .setFooter({ text: 'Community Zone • RPS Challenge' })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`rps_join_${userId}_${betAmount}`)
          .setLabel('🤝 Join Match | انضمام للتحدي')
          .setStyle(ButtonStyle.Success)
      );

      await interaction.reply({ content: '✅ Challenge lobby created!', ephemeral: true });
      return interaction.channel.send({ embeds: [challengeEmbed], components: [row] });
    }

    // ── 3. Join Challenge Button ──
    if (interaction.isButton() && customId.startsWith('rps_join_')) {
      const parts = customId.split('_');
      const p1Id = parts[2];
      const betAmount = parseInt(parts[3], 10);
      const p2Id = interaction.user.id;

      if (p2Id === p1Id) {
        return interaction.reply({
          content: '❌ You cannot join your own challenge! | لا يمكنك الانضمام لتحديك الخاص.',
          ephemeral: true
        });
      }

      await interaction.deferReply({ ephemeral: true });

      const guildId = interaction.guildId;
      const p2Xp = levelingManager.getUserData(guildId, p2Id)?.xp || 0;

      if (p2Xp < betAmount) {
        return interaction.editReply({
          content: `❌ You do not have enough XP to match this bet! You need \`${betAmount.toLocaleString()} XP\` but only have \`${p2Xp.toLocaleString()} XP\`.`
        });
      }

      // Initialize game state
      const messageId = interaction.message.id;
      const p1 = await interaction.guild.members.fetch(p1Id).catch(() => null);
      if (!p1) {
        return interaction.editReply({ content: '❌ Failed to find the challenger in the server.' });
      }

      const gameData = {
        id: messageId,
        guildId,
        channelId: interaction.channelId,
        bet: betAmount,
        round: 1,
        history: [],
        player1: {
          id: p1Id,
          tag: p1.user.username,
          choice: null,
          score: 0
        },
        player2: {
          id: p2Id,
          tag: interaction.user.username,
          choice: null,
          score: 0
        }
      };

      activeRpsGames.set(messageId, gameData);

      // Create active game interface
      const activeEmbed = new EmbedBuilder()
        .setColor(0x3B82F6)
        .setTitle('⚔️ RPS Match In Progress | مباراة جارية')
        .setDescription(
          `👤 **Player 1:** <@${p1Id}> — Score: \`0\`\n` +
          `👤 **Player 2:** <@${p2Id}> — Score: \`0\`\n\n` +
          `💰 **Bet:** \`${betAmount.toLocaleString()} XP\`\n` +
          `📊 **Round:** \`1\`\n\n` +
          `Please make your move by clicking a button below!\n` +
          `الرجاء اختيار حركتك بالضغط على أحد الأزرار أدناه!`
        )
        .setFooter({ text: 'Community Zone • Best of 3' })
        .setTimestamp();

      const gameRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rps_play_rock').setLabel('🪨 Rock | حجرة').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('rps_play_paper').setLabel('📄 Paper | ورقة').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('rps_play_scissors').setLabel('✂️ Scissors | مقص').setStyle(ButtonStyle.Primary)
      );

      await interaction.message.edit({ embeds: [activeEmbed], components: [gameRow] });
      return interaction.editReply({ content: '✅ You have joined the match! Play your move below.' });
    }

    // ── 4. Making a Play ──
    if (interaction.isButton() && customId.startsWith('rps_play_')) {
      const messageId = interaction.message.id;
      const game = activeRpsGames.get(messageId);

      if (!game) {
        return interaction.reply({
          content: '❌ Game not found or already ended. | اللعبة غير موجودة أو انتهت بالفعل.',
          ephemeral: true
        });
      }

      const userId = interaction.user.id;
      let playerKey = null;

      if (userId === game.player1.id) playerKey = 'player1';
      else if (userId === game.player2.id) playerKey = 'player2';

      if (!playerKey) {
        return interaction.reply({
          content: '❌ You are not part of this match! | أنت لست جزءاً من هذه المباراة.',
          ephemeral: true
        });
      }

      if (game[playerKey].choice) {
        return interaction.reply({
          content: '⚠️ You have already made your move for this round! | لقد قمت باختيارك لهذه الجولة بالفعل!',
          ephemeral: true
        });
      }

      const choice = customId.replace('rps_play_', ''); // 'rock', 'paper', 'scissors'
      game[playerKey].choice = choice;

      const choiceEmojiMap = { rock: '🪨', paper: '📄', scissors: '✂️' };
      await interaction.reply({
        content: `✅ You selected **${choiceEmojiMap[choice]} ${choice.toUpperCase()}**! Waiting for the opponent...`,
        ephemeral: true
      });

      // Update descriptions and check status
      const p1Status = game.player1.choice ? '✅ Ready' : '⏳ Choosing...';
      const p2Status = game.player2.choice ? '✅ Ready' : '⏳ Choosing...';

      // Check if both have chosen
      if (game.player1.choice && game.player2.choice) {
        const choice1 = game.player1.choice;
        const choice2 = game.player2.choice;
        const emoji1 = choiceEmojiMap[choice1];
        const emoji2 = choiceEmojiMap[choice2];

        let resultText = '';
        let winnerKey = null;

        if (choice1 === choice2) {
          resultText = 'Draw / تعادل';
        } else if (
          (choice1 === 'rock' && choice2 === 'scissors') ||
          (choice1 === 'scissors' && choice2 === 'paper') ||
          (choice1 === 'paper' && choice2 === 'rock')
        ) {
          winnerKey = 'player1';
          game.player1.score++;
          resultText = `<@${game.player1.id}> won / فاز`;
        } else {
          winnerKey = 'player2';
          game.player2.score++;
          resultText = `<@${game.player2.id}> won / فاز`;
        }

        const roundLog = `Round ${game.round}: <@${game.player1.id}> (${emoji1}) vs <@${game.player2.id}> (${emoji2}) ➔ **${resultText}**`;
        game.history.push(roundLog);

        // Reset choices
        game.player1.choice = null;
        game.player2.choice = null;

        // Check for match winner (best of 3 rounds: first to 3 wins)
        const winThreshold = 3;
        if (game.player1.score >= winThreshold || game.player2.score >= winThreshold) {
          const winKey = game.player1.score >= winThreshold ? 'player1' : 'player2';
          const loseKey = winKey === 'player1' ? 'player2' : 'player1';

          const winnerId = game[winKey].id;
          const loserId = game[loseKey].id;
          const bet = game.bet;
          const guildId = game.guildId;

          // Adjust XP
          const winnerXp = levelingManager.getUserData(guildId, winnerId)?.xp || 0;
          const loserXp = levelingManager.getUserData(guildId, loserId)?.xp || 0;

          const newWinnerXp = winnerXp + bet;
          const newLoserXp = Math.max(0, loserXp - bet);

          const finalWinnerData = levelingManager.setUserXp(guildId, winnerId, newWinnerXp);
          const finalLoserData = levelingManager.setUserXp(guildId, loserId, newLoserXp);

          // Build final embed
          const gameOverEmbed = new EmbedBuilder()
            .setColor(0x10B981) // Green
            .setTitle('🏆 Rock-Paper-Scissors Match Over! | انتهت المباراة')
            .setDescription(
              `👑 **Winner:** <@${winnerId}> won the match (**${game[winKey].score}-${game[loseKey].score}**)\n` +
              `💥 **Prize Pool:** \`${(bet * 2).toLocaleString()} XP\`\n\n` +
              `**📝 Round History / سجل الجولات:**\n` +
              game.history.map(h => `• ${h}`).join('\n') + '\n\n' +
              `📈 **Leveling Update:**\n` +
              `• <@${winnerId}> won **+${bet.toLocaleString()} XP** (New Total: \`${newWinnerXp.toLocaleString()} XP\` - Level ${finalWinnerData.level})\n` +
              `• <@${loserId}> lost **-${bet.toLocaleString()} XP** (New Total: \`${newLoserXp.toLocaleString()} XP\` - Level ${finalLoserData.level})`
            )
            .setFooter({ text: 'Community Zone • Game Complete' })
            .setTimestamp();

          activeRpsGames.delete(messageId);
          await interaction.message.edit({ embeds: [gameOverEmbed], components: [] });

          // Send public chat notification with tag pings
          return interaction.channel.send({
            content: `👑 **Congratulations** <@${winnerId}>! You won the RPS challenge against <@${loserId}> and won **${bet.toLocaleString()} XP**!\n` +
                     `💔 <@${loserId}>, you lost **${bet.toLocaleString()} XP**. Your current XP now is \`${newLoserXp.toLocaleString()}\` (Level ${finalLoserData.level}).`
          });
        } else {
          // Advance to next round
          game.round++;
          const nextRoundEmbed = new EmbedBuilder()
            .setColor(0x3B82F6)
            .setTitle('⚔️ RPS Match In Progress | مباراة جارية')
            .setDescription(
              `👤 **Player 1:** <@${game.player1.id}> — Score: \`${game.player1.score}\`\n` +
              `👤 **Player 2:** <@${game.player2.id}> — Score: \`${game.player2.score}\`\n\n` +
              `💰 **Bet:** \`${game.bet.toLocaleString()} XP\`\n` +
              `📊 **Round:** \`${game.round}\`\n\n` +
              `**📝 Round History:**\n` +
              game.history.map(h => `• ${h}`).join('\n') + `\n\n` +
              `Make your move for Round ${game.round}!`
            )
            .setFooter({ text: 'Community Zone • Best of 3' })
            .setTimestamp();

          return interaction.message.edit({ embeds: [nextRoundEmbed] });
        }
      } else {
        // Just update status (e.g. who has chosen)
        const partialEmbed = new EmbedBuilder()
          .setColor(0x3B82F6)
          .setTitle('⚔️ RPS Match In Progress | مباراة جارية')
          .setDescription(
            `👤 **Player 1:** <@${game.player1.id}> — Score: \`${game.player1.score}\` (${p1Status})\n` +
            `👤 **Player 2:** <@${game.player2.id}> — Score: \`${game.player2.score}\` (${p2Status})\n\n` +
            `💰 **Bet:** \`${game.bet.toLocaleString()} XP\`\n` +
            `📊 **Round:** \`${game.round}\`\n\n` +
            (game.history.length > 0 ? `**📝 Round History:**\n` + game.history.map(h => `• ${h}`).join('\n') + `\n\n` : '') +
            `Please make your move by clicking a button below!`
          )
          .setFooter({ text: 'Community Zone • Best of 3' })
          .setTimestamp();

        return interaction.message.edit({ embeds: [partialEmbed] });
      }
    }

    // ==========================================
    // ADMIN PANEL — Ban / Kick / Timeout / Unban / Warn / User Info (Arabic & English Support)
    // ==========================================


    // ── 1. Ban Button (🔨 Ban | حظر) ──
    if (interaction.isButton() && customId === 'admin_panel_ban') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: '⛔ Only **Administrators** can use this. | فقط **المسؤولون** يمكنهم استخدام هذا.', ephemeral: true });
      
      const embed = new EmbedBuilder()
        .setColor(0xEF4444)
        .setTitle('🔨 Ban Member | حظر عضو')
        .setDescription('Select the member you want to permanently ban from the dropdown below.\nاختر العضو الذي تريد حظره نهائياً من القائمة أدناه.');
      
      const select = new UserSelectMenuBuilder()
        .setCustomId('admin_select_ban')
        .setPlaceholder('Choose user to ban... | اختر عضواً لحظره...');

      const row = new ActionRowBuilder().addComponents(select);
      return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    // ── 2. Kick Button (👢 Kick | طرد) ──
    if (interaction.isButton() && customId === 'admin_panel_kick') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: '⛔ Only **Administrators** can use this. | فقط **المسؤولون** يمكنهم استخدام هذا.', ephemeral: true });

      const embed = new EmbedBuilder()
        .setColor(0xF59E0B)
        .setTitle('👢 Kick Member | طرد عضو')
        .setDescription('Select the member you want to kick from the dropdown below.\nاختر العضو الذي تريد طرده من القائمة أدناه.');
      
      const select = new UserSelectMenuBuilder()
        .setCustomId('admin_select_kick')
        .setPlaceholder('Choose user to kick... | اختر عضواً لطردة...');

      const row = new ActionRowBuilder().addComponents(select);
      return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    // ── 3. Timeout Button (⏰ Timeout | كتم مؤقت) ──
    if (interaction.isButton() && customId === 'admin_panel_timeout') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: '⛔ Only **Administrators** can use this. | فقط **المسؤولون** يمكنهم استخدام هذا.', ephemeral: true });

      const embed = new EmbedBuilder()
        .setColor(0x3B82F6)
        .setTitle('⏰ Timeout Member | كتم عضو مؤقتاً')
        .setDescription('Select the member you want to mute (timeout) from the dropdown below.\nاختر العضو الذي تريد كتمه مؤقتاً من القائمة أدناه.');
      
      const select = new UserSelectMenuBuilder()
        .setCustomId('admin_select_timeout')
        .setPlaceholder('Choose user to timeout... | اختر عضواً لكتمه...');

      const row = new ActionRowBuilder().addComponents(select);
      return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    // ── 4. Unban Button (🔓 Unban | رفع الحظر) ──
    if (interaction.isButton() && customId === 'admin_panel_unban') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: '⛔ Only **Administrators** can use this. | فقط **المسؤولون** يمكنهم استخدام هذا.', ephemeral: true });

      const modal = new ModalBuilder()
        .setCustomId('admin_unban_submit')
        .setTitle('🔓 Unban User | رفع الحظر');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('unban_user_id')
            .setLabel('User | العضو')
            .setPlaceholder('Username, ID, or Mention | الاسم أو المعرف')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('unban_reason')
            .setLabel('Reason | السبب')
            .setPlaceholder('Reason for unbanning... | سبب رفع الحظر...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(512)
        )
      );
      return interaction.showModal(modal);
    }

    // ── 5. Warn Button (⚠️ Warn | تحذير) ──
    if (interaction.isButton() && customId === 'admin_panel_warn') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: '⛔ Only **Administrators** can use this. | فقط **المسؤولون** يمكنهم استخدام هذا.', ephemeral: true });

      const embed = new EmbedBuilder()
        .setColor(0x8B5CF6)
        .setTitle('⚠️ Warn Member | تحذير عضو')
        .setDescription('Select the member you want to warn from the dropdown below.\nاختر العضو الذي تريد تحذيره من القائمة أدناه.');
      
      const select = new UserSelectMenuBuilder()
        .setCustomId('admin_select_warn')
        .setPlaceholder('Choose user to warn... | اختر عضواً لتحذيره...');

      const row = new ActionRowBuilder().addComponents(select);
      return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    // ── 6. User Info Button (📋 Info | معلومات) ──
    if (interaction.isButton() && customId === 'admin_panel_info') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: '⛔ Only **Administrators** can use this. | فقط **المسؤولون** يمكنهم استخدام هذا.', ephemeral: true });

      const embed = new EmbedBuilder()
        .setColor(0x6366F1)
        .setTitle('📋 User Info | معلومات العضو')
        .setDescription('Select the member whose details you want to view.\nاختر العضو الذي تريد عرض بياناته.');
      
      const select = new UserSelectMenuBuilder()
        .setCustomId('admin_select_info')
        .setPlaceholder('Choose user... | اختر عضواً...');

      const row = new ActionRowBuilder().addComponents(select);
      return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    // ==========================================
    // ADMIN PANEL SELECT MENU HANDLERS
    // ==========================================

    // ── Ban Select Menu ──
    if (interaction.isAnySelectMenu() && customId === 'admin_select_ban') {
      const selectedUserId = interaction.values[0];
      const modal = new ModalBuilder()
        .setCustomId(`admin_ban_submit_${selectedUserId}`)
        .setTitle('🔨 Ban Member | حظر العضو');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('ban_reason')
            .setLabel('Reason | السبب')
            .setPlaceholder('Reason for the ban... | سبب الحظر...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(512)
        )
      );
      return interaction.showModal(modal);
    }

    // ── Kick Select Menu ──
    if (interaction.isAnySelectMenu() && customId === 'admin_select_kick') {
      const selectedUserId = interaction.values[0];
      const modal = new ModalBuilder()
        .setCustomId(`admin_kick_submit_${selectedUserId}`)
        .setTitle('👢 Kick Member | طرد العضو');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('kick_reason')
            .setLabel('Reason | السبب')
            .setPlaceholder('Reason for the kick... | سبب الطرد...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(512)
        )
      );
      return interaction.showModal(modal);
    }

    // ── Timeout Select Menu ──
    if (interaction.isAnySelectMenu() && customId === 'admin_select_timeout') {
      const selectedUserId = interaction.values[0];
      const modal = new ModalBuilder()
        .setCustomId(`admin_timeout_submit_${selectedUserId}`)
        .setTitle('⏰ Timeout Member | كتم العضو مؤقتاً');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('timeout_duration')
            .setLabel('Duration (Minutes) | المدة بالدقائق')
            .setPlaceholder('e.g. 5, 10, 60, 1440')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('timeout_reason')
            .setLabel('Reason | السبب')
            .setPlaceholder('Reason for the timeout... | سبب الكتم...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(512)
        )
      );
      return interaction.showModal(modal);
    }

    // ── Warn Select Menu ──
    if (interaction.isAnySelectMenu() && customId === 'admin_select_warn') {
      const selectedUserId = interaction.values[0];
      const modal = new ModalBuilder()
        .setCustomId(`admin_warn_submit_${selectedUserId}`)
        .setTitle('⚠️ Warn Member | تحذير العضو');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('warn_reason')
            .setLabel('Warning Reason | سبب التحذير')
            .setPlaceholder('Reason for the warning... | سبب التحذير...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(512)
        )
      );
      return interaction.showModal(modal);
    }

    // ── Info Select Menu ──
    if (interaction.isAnySelectMenu() && customId === 'admin_select_info') {
      const selectedUserId = interaction.values[0];
      await interaction.deferReply({ ephemeral: true });

      const targetUser = await interaction.client.users.fetch(selectedUserId).catch(() => null);
      if (!targetUser) return interaction.editReply({ content: '❌ User not found. | لم يتم العثور على العضو.' });

      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      const joinedStr = member?.joinedAt ? '<t:' + Math.floor(member.joinedAt.getTime() / 1000) + ':F>' : '`Not in server | ليس في السيرفر`';
      const roles = member?.roles.cache.filter(r => r.id !== interaction.guild.roles.everyone.id).map(r => '<@&' + r.id + '>').join(', ') || '`None | لا يوجد`';
      const createdStr = '<t:' + Math.floor(targetUser.createdAt.getTime() / 1000) + ':F>';

      const infoEmbed = new EmbedBuilder()
        .setColor(0x6366F1)
        .setTitle('📋 User Info | معلومات المستخدم — ' + targetUser.tag)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '🆔 User ID | معرف المستخدم',         value: '`' + targetUser.id + '`', inline: true },
          { name: '🤖 Bot? | آلي؟',             value: targetUser.bot ? 'Yes | نعم' : 'No | لا', inline: true },
          { name: '📅 Account Created | تاريخ الإنشاء',  value: createdStr, inline: false },
          { name: '📥 Joined Server | الانضمام للسيرفر',    value: joinedStr, inline: false },
          { name: '🎭 Roles | الرتب',            value: roles.length > 1024 ? roles.slice(0, 1020) + '...' : roles, inline: false },
        )
        .setTimestamp()
        .setFooter({ text: 'Requested by | طلب بواسطة ' + interaction.user.tag });

      return interaction.editReply({ embeds: [infoEmbed] });
    }

    // ==========================================
    // TEMP VOICE ELECTION — Vote Select Menu & Buttons
    // ==========================================

    // ── Vote Select Menu — user picks their candidate ──
    if (interaction.isAnySelectMenu() && customId.startsWith('temp_voice_vote_menu_')) {
      const voiceId = customId.substring('temp_voice_vote_menu_'.length);
      const room = tempVoiceManager.getRoomByVoiceId(voiceId);

      if (!room || !room.claimSession) {
        return interaction.reply({ content: '⌛ The election has already ended or is not active. | انتهت الانتخابات أو لم تبدأ.', ephemeral: true });
      }

      // Must be in the voice channel to vote
      const voiceChannel = interaction.guild.channels.cache.get(voiceId) ||
        await interaction.guild.channels.fetch(voiceId).catch(() => null);
      if (!voiceChannel || !voiceChannel.members.has(interaction.user.id)) {
        return interaction.reply({ content: '⛔ You must be inside the voice channel to vote. | يجب أن تكون داخل القناة الصوتية للتصويت.', ephemeral: true });
      }

      const candidateId = interaction.values[0];
      const isFirstVote = !room.claimSession.votes.has(interaction.user.id);
      const prevVote = room.claimSession.votes.get(interaction.user.id);
      room.claimSession.votes.set(interaction.user.id, candidateId);

      const candidateMember = interaction.guild.members.cache.get(candidateId) ||
        await interaction.guild.members.fetch(candidateId).catch(() => null);
      const candidateName = candidateMember ? candidateMember.user.username : `<@${candidateId}>`;

      // Rebuild live standings
      const voteCounts = {};
      room.claimSession.votes.forEach((votedId) => {
        voteCounts[votedId] = (voteCounts[votedId] || 0) + 1;
      });

      const standingsLines = Object.entries(voteCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([memberId, count]) => {
          const mem = interaction.guild.members.cache.get(memberId);
          const name = mem ? mem.user.username : memberId;
          return `• **${name}** — \`${count}\` vote(s)`;
        })
        .join('\n') || '`No votes yet | لا توجد أصوات`';

      // Update the election embed with live standings
      if (room.claimSession.messageId) {
        const voteMsg = await voiceChannel.messages.fetch(room.claimSession.messageId).catch(() => null);
        if (voteMsg) {
          const updatedEmbed = EmbedBuilder.from(voteMsg.embeds[0])
            .spliceFields(0, 1, { name: '📊 Live Standings | النتائج المباشرة', value: standingsLines });
          await voteMsg.edit({ embeds: [updatedEmbed] }).catch(() => null);
        }
      }

      const msg = isFirstVote
        ? `✅ Your vote for **${candidateName}** has been recorded! | تم تسجيل صوتك لـ **${candidateName}**!`
        : `🔄 Vote changed from <@${prevVote}> → **${candidateName}** | تم تغيير صوتك إلى **${candidateName}**`;

      return interaction.reply({ content: msg, ephemeral: true });
    }

    // ── Open Vote Dropdown Button — sends ephemeral dropdown for voting ──
    if (interaction.isButton() && customId.startsWith('temp_voice_vote_open_')) {
      const voiceId = customId.substring('temp_voice_vote_open_'.length);
      const room = tempVoiceManager.getRoomByVoiceId(voiceId);

      if (!room || !room.claimSession) {
        return interaction.reply({ content: '⌛ The election has already ended or is not active. | انتهت الانتخابات أو لم تبدأ.', ephemeral: true });
      }

      const voiceChannel = interaction.guild.channels.cache.get(voiceId) ||
        await interaction.guild.channels.fetch(voiceId).catch(() => null);
      if (!voiceChannel || !voiceChannel.members.has(interaction.user.id)) {
        return interaction.reply({ content: '⛔ You must be inside the voice channel to vote. | يجب أن تكون داخل القناة الصوتية للتصويت.', ephemeral: true });
      }

      const remainingMembers = voiceChannel.members.filter(m => !m.user.bot && m.id !== room.ownerId);
      if (remainingMembers.size === 0) {
        return interaction.reply({ content: '⚠️ No candidates available. | لا يوجد مرشحون متاحون.', ephemeral: true });
      }

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`temp_voice_vote_menu_${voiceId}`)
        .setPlaceholder('Vote for the new owner | تصويت للمالك الجديد')
        .addOptions(
          remainingMembers.map(m => ({
            label: m.user.username.slice(0, 25),
            description: m.nickname ? m.nickname.slice(0, 50) : `User Tag: ${m.user.tag.slice(0, 37)}`,
            value: m.id
          })).slice(0, 25)
        );

      const row = new ActionRowBuilder().addComponents(selectMenu);
      return interaction.reply({
        content: '🗳️ Select the new owner from the dropdown below: | اختر المالك الجديد من القائمة أدناه:',
        components: [row],
        ephemeral: true
      });
    }

    // ── Skip Vote Button — user opts out of voting ──
    if (interaction.isButton() && customId.startsWith('temp_voice_vote_skip_')) {
      const voiceId = customId.substring('temp_voice_vote_skip_'.length);
      const room = tempVoiceManager.getRoomByVoiceId(voiceId);

      if (!room || !room.claimSession) {
        return interaction.reply({ content: '⌛ No active election. | لا توجد انتخابات نشطة.', ephemeral: true });
      }

      const voiceChannel = interaction.guild.channels.cache.get(voiceId) ||
        await interaction.guild.channels.fetch(voiceId).catch(() => null);
      if (!voiceChannel || !voiceChannel.members.has(interaction.user.id)) {
        return interaction.reply({ content: '⛔ You must be inside the voice channel. | يجب أن تكون داخل القناة الصوتية.', ephemeral: true });
      }

      // Remove any existing vote if they had one, mark as abstained
      room.claimSession.votes.delete(interaction.user.id);
      return interaction.reply({ content: '✅ You chose to abstain. Your vote has been removed. | اخترت الامتناع عن التصويت.', ephemeral: true });
    }

    // ── Ban Modal Submit ──
    if (interaction.isModalSubmit() && customId.startsWith('admin_ban_submit')) {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: '⛔ Only **Administrators** can use this. | فقط **المسؤولون** يمكنهم استخدام هذا.', ephemeral: true });
      
      await interaction.deferReply({ ephemeral: true });
      
      let userId;
      if (customId.startsWith('admin_ban_submit_')) {
        userId = customId.substring('admin_ban_submit_'.length);
      } else {
        userId = interaction.fields.getTextInputValue('ban_user_id').trim();
      }
      const reason = interaction.fields.getTextInputValue('ban_reason').trim();

      let targetUser;
      try {
        targetUser = await resolveUser(interaction.guild, userId);
      } catch (e) {
        return interaction.editReply({ content: '❌ ' + e.message });
      }

      if (!targetUser) 
        return interaction.editReply({ content: '❌ User not found. | لم يتم العثور على العضو.' });

      if (targetUser.id === interaction.user.id) 
        return interaction.editReply({ content: '❌ You cannot ban yourself. | لا يمكنك حظر نفسك.' });
      if (targetUser.id === interaction.client.user.id) 
        return interaction.editReply({ content: '❌ You cannot ban the bot. | لا يمكنك حظر البوت.' });

      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (targetMember && !targetMember.bannable)
        return interaction.editReply({ content: '❌ I cannot ban this member. Check my role position. | لا يمكنني حظر هذا العضو، يرجى التحقق من رتبة البوت.' });

      // DM before ban (Bilingual)
      const dmEmbed = new EmbedBuilder()
        .setTitle('🔨 You Have Been Banned | لقد تم حظرك')
        .setColor(0xEF4444)
        .setDescription(
          `You have been **permanently banned** from **${interaction.guild.name}**.\n` +
          `لقد تم حظرك **نهائياً** من سيرفر **${interaction.guild.name}**.\n\n` +
          `>>> 📋 **Reason | السبب:**\n${reason}`
        )
        .addFields(
          { name: '🏠 Server | السيرفر', value: interaction.guild.name, inline: true },
          { name: '👮 Banned By | بواسطة', value: interaction.user.tag, inline: true },
          { name: '📅 Date | التاريخ', value: '<t:' + Math.floor(Date.now() / 1000) + ':F>', inline: false }
        )
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .setTimestamp()
        .setFooter({ text: interaction.guild.name + ' • Moderation System' });
      
      const dmOk = await targetUser.send({ embeds: [dmEmbed] }).then(() => true).catch(() => false);

      try {
        const warnManager = require('../../utils/warnManager');
        warnManager.addModerationAction(interaction.guildId, targetUser.id, 'BAN', reason, interaction.user.id);
        await interaction.guild.members.ban(targetUser.id, { reason: 'Banned by ' + interaction.user.tag + ': ' + reason });
      } catch (e) {
        return interaction.editReply({ content: '❌ Failed to ban | فشل الحظر: ' + e.message });
      }

      // Professional Public Announcement to configured Ban Channel
      const banChannelId = config.banAnnouncementChannelId;
      if (banChannelId) {
        const banChannel = await interaction.guild.channels.fetch(banChannelId).catch(() => null);
        if (banChannel) {
          const annEmbed = new EmbedBuilder()
            .setTitle('⛔ Member Permanently Banned | تم حظر عضو نهائياً')
            .setColor(0xEF4444)
            .setDescription(
              `> 🚨 **${targetUser.tag}** has been permanently banned from the server.\n` +
              `> لقد تم حظر **${targetUser.tag}** نهائياً من السيرفر.\n\n` +
              `📋 **Reason | السبب:**\n\`\`\`${reason}\`\`\``
            )
            .addFields(
              { name: '👤 Banned Member | العضو المحظور', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
              { name: '🆔 User ID | معرف العضو', value: `\`${targetUser.id}\``, inline: true },
              { name: '👮 Banned By | بواسطة', value: `<@${interaction.user.id}>`, inline: true },
              { name: '📅 Date | التاريخ', value: '<t:' + Math.floor(Date.now() / 1000) + ':F>', inline: false }
            )
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Community Zone • Dev by Akaza_senior', iconURL: interaction.guild.iconURL({ dynamic: true }) });

          await banChannel.send({
            content: `@everyone ⚠️ **${targetUser.tag}** has been banned. | تم حظر العضو.\n📋 **Reason | السبب:** ${reason}`,
            embeds: [annEmbed],
            allowedMentions: { parse: ['everyone'] },
          }).catch(() => null);
        }
      }

      await logger.warning(interaction.client, '⛔ Member Banned (Admin Panel)', [
        { name: 'Target', value: targetUser.tag + ' (`' + targetUser.id + '`)' },
        { name: 'Banned By', value: interaction.user.tag },
        { name: 'Reason', value: reason },
      ]);

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x10B981)
            .setTitle('✅ Ban Executed | تم الحظر بنجاح')
            .setDescription(
              `**${targetUser.tag}** has been banned. | تم حظر العضو.\n` +
              `✉️ DM | الخاص: ` + (dmOk ? '✅ Delivered | تم الإرسال' : '❌ Closed | الخاص مغلق')
            )
        ]
      });
    }

    // ── Kick Modal Submit ──
    if (interaction.isModalSubmit() && customId.startsWith('admin_kick_submit')) {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: '⛔ Only **Administrators** can use this. | فقط **المسؤولون** يمكنهم استخدام هذا.', ephemeral: true });

      await interaction.deferReply({ ephemeral: true });
      
      let userId;
      if (customId.startsWith('admin_kick_submit_')) {
        userId = customId.substring('admin_kick_submit_'.length);
      } else {
        userId = interaction.fields.getTextInputValue('kick_user_id').trim();
      }
      const reason = interaction.fields.getTextInputValue('kick_reason').trim();

      let targetUser;
      try {
        targetUser = await resolveUser(interaction.guild, userId);
      } catch (e) {
        return interaction.editReply({ content: '❌ ' + e.message });
      }

      if (!targetUser) 
        return interaction.editReply({ content: '❌ User not found. | لم يتم العثور على العضو.' });

      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!targetMember) return interaction.editReply({ content: '❌ That user is not in this server. | هذا المستخدم ليس في السيرفر.' });
      if (!targetMember.kickable) return interaction.editReply({ content: '❌ I cannot kick this member. Check my role position. | لا يمكنني طرد هذا العضو.' });

      // DM before kick (Bilingual)
      const kickDmEmbed = new EmbedBuilder()
        .setTitle('👢 You Have Been Kicked | لقد تم طردك')
        .setColor(0xF59E0B)
        .setDescription(
          `You have been **kicked** from **${interaction.guild.name}**.\n` +
          `لقد تم طردك من سيرفر **${interaction.guild.name}**.\n\n` +
          `>>> 📋 **Reason | السبب:**\n${reason}`
        )
        .addFields(
          { name: '🏠 Server | السيرفر', value: interaction.guild.name, inline: true },
          { name: '👮 Kicked By | بواسطة', value: interaction.user.tag, inline: true }
        )
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .setTimestamp()
        .setFooter({ text: interaction.guild.name + ' • Moderation System' });

      const kickDmOk = await targetUser.send({ embeds: [kickDmEmbed] }).then(() => true).catch(() => false);

      try {
        const warnManager = require('../../utils/warnManager');
        warnManager.addModerationAction(interaction.guildId, targetUser.id, 'KICK', reason, interaction.user.id);
        await targetMember.kick('Kicked by ' + interaction.user.tag + ': ' + reason);
      } catch (e) {
        return interaction.editReply({ content: '❌ Failed to kick | فشل الطرد: ' + e.message });
      }

      // Professional Public Announcement to configured Kick Channel
      const kickChannelId = config.kickChannelId;
      if (kickChannelId) {
        const kickChannel = await interaction.guild.channels.fetch(kickChannelId).catch(() => null);
        if (kickChannel) {
          const kickAnnEmbed = new EmbedBuilder()
            .setTitle('👢 Member Kicked | تم طرد عضو')
            .setColor(0xF59E0B)
            .setDescription(
              `> 🚪 **${targetUser.tag}** was kicked from the server.\n` +
              `> تم طرد **${targetUser.tag}** من السيرفر.\n\n` +
              `📋 **Reason | السبب:**\n\`\`\`${reason}\`\`\``
            )
            .addFields(
              { name: '👤 Member | العضو المطرود', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
              { name: '🆔 User ID | معرف العضو', value: `\`${targetUser.id}\``, inline: true },
              { name: '👮 Kicked By | بواسطة', value: `<@${interaction.user.id}>`, inline: true },
              { name: '📅 Date | التاريخ', value: '<t:' + Math.floor(Date.now() / 1000) + ':F>', inline: false }
            )
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Community Zone • Dev by Akaza_senior', iconURL: interaction.guild.iconURL({ dynamic: true }) });
          await kickChannel.send({ embeds: [kickAnnEmbed] }).catch(() => null);
        }
      }

      await logger.warning(interaction.client, '👢 Member Kicked (Admin Panel)', [
        { name: 'Target', value: targetUser.tag + ' (`' + targetUser.id + '`)' },
        { name: 'Kicked By', value: interaction.user.tag },
        { name: 'Reason', value: reason },
      ]);

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x10B981)
            .setTitle('✅ Kick Executed | تم الطرد بنجاح')
            .setDescription(
              `**${targetUser.tag}** has been kicked. | تم طرد العضو.\n` +
              `✉️ DM | الخاص: ` + (kickDmOk ? '✅ Delivered | تم الإرسال' : '❌ Closed | الخاص مغلق')
            )
        ]
      });
    }

    // ── Timeout Modal Submit ──
    if (interaction.isModalSubmit() && customId.startsWith('admin_timeout_submit')) {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: '⛔ Only **Administrators** can use this. | فقط **المسؤولون** يمكنهم استخدام هذا.', ephemeral: true });

      await interaction.deferReply({ ephemeral: true });
      
      let userId;
      if (customId.startsWith('admin_timeout_submit_')) {
        userId = customId.substring('admin_timeout_submit_'.length);
      } else {
        userId = interaction.fields.getTextInputValue('timeout_user_id').trim();
      }
      const durationInput = interaction.fields.getTextInputValue('timeout_duration').trim();
      const reason = interaction.fields.getTextInputValue('timeout_reason').trim();

      const durationMinutes = parseInt(durationInput, 10);
      if (isNaN(durationMinutes) || durationMinutes <= 0) {
        return interaction.editReply({ content: '❌ Invalid duration. Please provide a positive number of minutes. | مدة غير صالحة. يرجى إدخال رقم موجب بالدقائق.' });
      }

      let targetUser;
      try {
        targetUser = await resolveUser(interaction.guild, userId);
      } catch (e) {
        return interaction.editReply({ content: '❌ ' + e.message });
      }

      if (!targetUser) 
        return interaction.editReply({ content: '❌ User not found. | لم يتم العثور على العضو.' });

      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!targetMember) return interaction.editReply({ content: '❌ That user is not in this server. | هذا العضو ليس في السيرفر.' });
      if (!targetMember.moderatable) return interaction.editReply({ content: '❌ I cannot moderate this member. Check my role position. | لا يمكنني كتم هذا العضو.' });

      // DM before timeout (Bilingual)
      const timeoutDmEmbed = new EmbedBuilder()
        .setTitle('⏰ You Have Been Muted | لقد تم كتمك مؤقتاً')
        .setColor(0xF59E0B)
        .setDescription(
          `You have been **timed out (muted)** in **${interaction.guild.name}** for **${durationMinutes} minutes**.\n` +
          `لقد تم كتمك مؤقتاً في سيرفر **${interaction.guild.name}** لمدة **${durationMinutes} دقيقة**.\n\n` +
          `>>> 📋 **Reason | السبب:**\n${reason}`
        )
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .setTimestamp()
        .setFooter({ text: interaction.guild.name + ' • Moderation System' });

      const dmOk = await targetUser.send({ embeds: [timeoutDmEmbed] }).then(() => true).catch(() => false);

      try {
        const warnManager = require('../../utils/warnManager');
        warnManager.addModerationAction(interaction.guildId, targetUser.id, 'TIMEOUT', reason, interaction.user.id, `${durationMinutes}m`);
        await targetMember.timeout(durationMinutes * 60 * 1000, `Timed out by ${interaction.user.tag}: ${reason}`);
      } catch (e) {
        return interaction.editReply({ content: '❌ Failed to timeout | فشل الكتم: ' + e.message });
      }

      // Professional Public Announcement to configured Timeout Channel
      const timeoutChannelId = config.timeoutChannelId;
      if (timeoutChannelId) {
        const timeoutChannel = await interaction.guild.channels.fetch(timeoutChannelId).catch(() => null);
        if (timeoutChannel) {
          const timeoutAnnEmbed = new EmbedBuilder()
            .setTitle('⏰ Member Timed Out (Muted) | كتم عضو مؤقتاً')
            .setColor(0x3B82F6)
            .setDescription(
              `> 🔇 **${targetUser.tag}** has been timed out (muted) in the server.\n` +
              `> تم كتم **${targetUser.tag}** مؤقتاً في السيرفر.\n\n` +
              `📋 **Reason | السبب:**\n\`\`\`${reason}\`\`\``
            )
            .addFields(
              { name: '👤 Target Member | العضو المكتوم', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
              { name: '⏱️ Duration | المدة', value: `${durationMinutes} minutes | دقيقة`, inline: true },
              { name: '👮 Muted By | بواسطة', value: `<@${interaction.user.id}>`, inline: true },
              { name: '📅 Expiration | تاريخ الانتهاء', value: `<t:${Math.floor((Date.now() + durationMinutes * 60000) / 1000)}:F> (<t:${Math.floor((Date.now() + durationMinutes * 60000) / 1000)}:R>)`, inline: false }
            )
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Community Zone • Dev by Akaza_senior', iconURL: interaction.guild.iconURL({ dynamic: true }) });
          await timeoutChannel.send({ embeds: [timeoutAnnEmbed] }).catch(() => null);
        }
      }

      await logger.warning(interaction.client, '⏰ Member Timed Out (Admin Panel)', [
        { name: 'Target', value: targetUser.tag + ' (`' + targetUser.id + '`)' },
        { name: 'Duration', value: `${durationMinutes} minutes` },
        { name: 'Muted By', value: interaction.user.tag },
        { name: 'Reason', value: reason },
      ]);

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x10B981)
            .setTitle('✅ Timeout Executed | تم الكتم المؤقت بنجاح')
            .setDescription(
              `**${targetUser.tag}** has been timed out for **${durationMinutes} minutes**. | تم كتم العضو لمدة ${durationMinutes} دقيقة.\n` +
              `✉️ DM | الخاص: ` + (dmOk ? '✅ Delivered | تم الإرسال' : '❌ Closed | الخاص مغلق')
            )
        ]
      });
    }

    // ── Unban Modal Submit ──
    if (interaction.isModalSubmit() && customId === 'admin_unban_submit') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: '⛔ Only **Administrators** can use this. | فقط **المسؤولون** يمكنهم استخدام هذا.', ephemeral: true });

      await interaction.deferReply({ ephemeral: true });
      const userId = interaction.fields.getTextInputValue('unban_user_id').trim();
      const reason = interaction.fields.getTextInputValue('unban_reason').trim();

      let targetId = userId;
      if (!/^\d{17,19}$/.test(userId)) {
        try {
          const bans = await interaction.guild.bans.fetch();
          const cleanQuery = userId.replace(/^@/, '');
          const query = cleanQuery.toLowerCase();
          const banMatch = bans.find(b => 
            b.user.username.toLowerCase() === query ||
            (b.user.globalName && b.user.globalName.toLowerCase() === query) ||
            b.user.tag.toLowerCase() === query
          );
          if (banMatch) {
            targetId = banMatch.user.id;
          } else {
            const partialMatch = bans.find(b => 
              b.user.username.toLowerCase().includes(query) ||
              b.user.tag.toLowerCase().includes(query) ||
              (b.user.globalName && b.user.globalName.toLowerCase().includes(query))
            );
            if (partialMatch) {
              targetId = partialMatch.user.id;
            } else {
              return interaction.editReply({ content: '❌ Could not find a banned user with that name. | لم يتم العثور على مستخدم محظور بهذا الاسم.' });
            }
          }
        } catch (e) {
          return interaction.editReply({ content: '❌ Failed to fetch server bans: ' + e.message });
        }
      }

      try {
        await interaction.guild.members.unban(targetId, `Unbanned by ${interaction.user.tag}: ${reason}`);
      } catch (e) {
        return interaction.editReply({ content: '❌ Failed to unban | فشل إلغاء الحظر: ' + e.message });
      }

      await logger.success(interaction.client, '🔓 Member Unbanned (Admin Panel)', [
        { name: 'Target ID', value: `\`${targetId}\`` },
        { name: 'Unbanned By', value: interaction.user.tag },
        { name: 'Reason', value: reason },
      ]);

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x10B981)
            .setTitle('✅ Unban Executed | تم إلغاء الحظر')
            .setDescription(
              `Successfully unbanned user ID **${targetId}**.\n` +
              `تم إلغاء الحظر بنجاح عن المعرف **${targetId}**.\n\n` +
              `📋 **Reason | السبب:** ${reason}`
            )
        ]
      });
    }

    // ── Warn Modal Submit ──
    if (interaction.isModalSubmit() && customId.startsWith('admin_warn_submit')) {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: '⛔ Only **Administrators** can use this. | فقط **المسؤولون** يمكنهم استخدام هذا.', ephemeral: true });

      await interaction.deferReply({ ephemeral: true });
      
      let userId;
      if (customId.startsWith('admin_warn_submit_')) {
        userId = customId.substring('admin_warn_submit_'.length);
      } else {
        userId = interaction.fields.getTextInputValue('warn_user_id').trim();
      }
      const reason = interaction.fields.getTextInputValue('warn_reason').trim();

      let targetUser;
      try {
        targetUser = await resolveUser(interaction.guild, userId);
      } catch (e) {
        return interaction.editReply({ content: '❌ ' + e.message });
      }

      if (!targetUser) 
        return interaction.editReply({ content: '❌ User not found. | لم يتم العثور على العضو.' });

      // DM warning (Bilingual)
      const warnDmEmbed = new EmbedBuilder()
        .setTitle('⚠️ Formal Warning | تحذير رسمي')
        .setColor(0xF59E0B)
        .setDescription(
          `You have received a formal warning in **${interaction.guild.name}**.\n` +
          `لقد تلقيت تحذيراً رسمياً في سيرفر **${interaction.guild.name}**.\n\n` +
          `>>> 📋 **Reason | السبب:**\n${reason}`
        )
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .setTimestamp()
        .setFooter({ text: interaction.guild.name + ' • Moderation System' });

      const dmOk = await targetUser.send({ embeds: [warnDmEmbed] }).then(() => true).catch(() => false);

      // Professional Public Announcement to configured Warn Channel
      const warnChannelId = config.warnChannelId;
      if (warnChannelId) {
        const warnChannel = await interaction.guild.channels.fetch(warnChannelId).catch(() => null);
        if (warnChannel) {
          const warnAnnEmbed = new EmbedBuilder()
            .setTitle('⚠️ Member Formally Warned | تحذير رسمي لعضو')
            .setColor(0x8B5CF6)
            .setDescription(
              `> 🚨 **${targetUser.tag}** has received a formal warning.\n` +
              `> تلقى **${targetUser.tag}** تحذيراً رسمياً في السيرفر.\n\n` +
              `📋 **Reason | السبب:**\n\`\`\`${reason}\`\`\``
            )
            .addFields(
              { name: '👤 Target Member | العضو المحذر', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
              { name: '🆔 User ID | معرف العضو', value: `\`${targetUser.id}\``, inline: true },
              { name: '👮 Warned By | بواسطة', value: `<@${interaction.user.id}>`, inline: true },
              { name: '📅 Date | التاريخ', value: '<t:' + Math.floor(Date.now() / 1000) + ':F>', inline: false }
            )
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Community Zone • Dev by Akaza_senior', iconURL: interaction.guild.iconURL({ dynamic: true }) });
          await warnChannel.send({ embeds: [warnAnnEmbed] }).catch(() => null);
        }
      }

      await logger.warning(interaction.client, '⚠️ Member Warned (Admin Panel)', [
        { name: 'Target', value: targetUser.tag + ' (`' + targetUser.id + '`)' },
        { name: 'Warned By', value: interaction.user.tag },
        { name: 'Reason', value: reason },
      ]);

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x10B981)
            .setTitle('✅ Warning Sent | تم إرسال التحذير')
            .setDescription(
              `Warning sent to **${targetUser.tag}**.\n` +
              `تم إرسال تحذير إلى **${targetUser.tag}**.\n` +
              `✉️ DM | الخاص: ` + (dmOk ? '✅ Delivered | تم الإرسال' : '❌ Closed | الخاص مغلق')
            )
        ]
      });
    }

    // ── User Info Modal Submit ──
    if (interaction.isModalSubmit() && customId.startsWith('admin_info_submit')) {
      await interaction.deferReply({ ephemeral: true });
      
      let userId;
      if (customId.startsWith('admin_info_submit_')) {
        userId = customId.substring('admin_info_submit_'.length);
      } else {
        userId = interaction.fields.getTextInputValue('info_user_id').trim();
      }

      let targetUser;
      try {
        targetUser = await resolveUser(interaction.guild, userId);
      } catch (e) {
        return interaction.editReply({ content: '❌ ' + e.message });
      }

      if (!targetUser) 
        return interaction.editReply({ content: '❌ User not found. | لم يتم العثور على العضو.' });

      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      const joinedStr = member?.joinedAt ? '<t:' + Math.floor(member.joinedAt.getTime() / 1000) + ':F>' : '`Not in server | ليس في السيرفر`';
      const roles = member?.roles.cache.filter(r => r.id !== interaction.guild.roles.everyone.id).map(r => '<@&' + r.id + '>').join(', ') || '`None | لا يوجد`';
      const createdStr = '<t:' + Math.floor(targetUser.createdAt.getTime() / 1000) + ':F>';

      const infoEmbed = new EmbedBuilder()
        .setColor(0x6366F1)
        .setTitle('📋 User Info | معلومات المستخدم — ' + targetUser.tag)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '🆔 User ID | معرف المستخدم',         value: '`' + targetUser.id + '`', inline: true },
          { name: '🤖 Bot? | آلي؟',             value: targetUser.bot ? 'Yes | نعم' : 'No | لا', inline: true },
          { name: '📅 Account Created | تاريخ الإنشاء',  value: createdStr, inline: false },
          { name: '📥 Joined Server | الانضمام للسيرفر',    value: joinedStr, inline: false },
          { name: '🎭 Roles | الرتب',            value: roles.length > 1024 ? roles.slice(0, 1020) + '...' : roles, inline: false },
        )
        .setTimestamp()
        .setFooter({ text: 'Requested by | طلب بواسطة ' + interaction.user.tag });

      return interaction.editReply({ embeds: [infoEmbed] });
    }

    // ==========================================
    // DYNAMIC & STATIC TEMP VOICE DASHBOARD CONTROLS RESOLUTION
    // ==========================================
    const tempVoiceControls = [
      'btn-rename', 'btn-limit', 'btn-mute', 'btn-kick', 'btn-info',
      'btn-lock', 'btn-unlock', 'btn-hide', 'btn-show', 'btn-access',
      'btn-allow', 'btn-deny', 'btn-transfer', 'btn-deafen',
      'modal-rename-room', 'modal-limit-room',
      'menu-transfer-owner', 'menu-kick-user', 'menu-allow-access',
      'menu-deny-access', 'menu-mute-toggle', 'menu-deafen-toggle'
    ];

    const isTempVoiceControl = tempVoiceControls.includes(customId);
    if (!isTempVoiceControl) {
      return; // If not a temp voice control interaction, do not proceed or interfere
    }

    // A: Try to resolve the room from current channel ID (dynamic built-in text chat)
    let room = tempVoiceManager.getRoomByVoiceId(interaction.channelId);

    // B: If not found, try to resolve from user ownership (static server-wide control panel)
    if (!room) {
      room = tempVoiceManager.getRoomByOwnerId(interaction.user.id);
    }

    // C: If still no room found, user is attempting control without owning an active channel
    if (!room) {
      const noRoomEmbed = embedGenerator.error(
        '❌ You do not own an active temporary voice channel.\nCreate one by joining the trigger channel first!\n\n' +
        'لا تملك قناة صوتية مؤقتة نشطة حالياً.\nقم بإنشاء واحدة أولاً عن طريق الانضمام إلى القناة المخصصة.',
        'No Active Voice Room | لا توجد قناة نشطة'
      );
      return interaction.reply({ embeds: [noRoomEmbed], ephemeral: true });
    }

    // D: Enforce Global Block List
    if (restrictionManager.isMemberBlocked(interaction.member)) {
      const blockEmbed = embedGenerator.error(
        '⛔ You are globally blocked from using this bot\'s systems.',
        'Access Blocked'
      );
      return interaction.reply({ embeds: [blockEmbed], ephemeral: true });
    }

    // Fetch the voice channel
    const voiceChannel = await interaction.guild.channels.fetch(room.voiceId).catch(() => null);
    const textChannel = null; // No separate text channel — voice built-in chat only

    if (!voiceChannel) {
      const errEmbed = embedGenerator.error('The temporary voice channel was not found. It may have been deleted manually.');
      return interaction.reply({ embeds: [errEmbed], ephemeral: true });
    }

    // E: Enforce Ownership check (security safeguard)
    if (room.ownerId !== interaction.user.id) {
      const denyEmbed = embedGenerator.error(
        `⚠️ Only the room owner (<@${room.ownerId}>) is authorized to use dashboard controls.`,
        'Permission Denied'
      );
      return interaction.reply({ embeds: [denyEmbed], ephemeral: true });
    }

    // ==========================================
    // 3. HANDLE BUTTON INTERACTIONS
    // ==========================================
    if (interaction.isButton()) {
      switch (customId) {
        // ----------------------------------------
        // RENAME ROOM (MODAL FLOW)
        // ----------------------------------------
        case 'btn-rename': {
          const modal = new ModalBuilder()
            .setCustomId('modal-rename-room')
            .setTitle('📝 Rename Voice Room');

          const textInput = new TextInputBuilder()
            .setCustomId('input-new-name')
            .setLabel('New Channel Name')
            .setStyle(TextInputStyle.Short)
            .setValue(voiceChannel.name)
            .setPlaceholder('Enter new room name here...')
            .setRequired(true)
            .setMaxLength(100);

          modal.addComponents(new ActionRowBuilder().addComponents(textInput));
          await interaction.showModal(modal);
          break;
        }

        // ----------------------------------------
        // SET USER LIMIT (MODAL FLOW)
        // ----------------------------------------
        case 'btn-limit': {
          const modal = new ModalBuilder()
            .setCustomId('modal-limit-room')
            .setTitle('👥 Set User Limit');

          const textInput = new TextInputBuilder()
            .setCustomId('input-new-limit')
            .setLabel('User Limit (0 for unlimited, max 99)')
            .setStyle(TextInputStyle.Short)
            .setValue(voiceChannel.userLimit.toString())
            .setPlaceholder('e.g. 5, 10, or 0')
            .setRequired(true)
            .setMaxLength(2);

          modal.addComponents(new ActionRowBuilder().addComponents(textInput));
          await interaction.showModal(modal);
          break;
        }

        // ----------------------------------------
        // LOCK ROOM
        // ----------------------------------------
        case 'btn-lock': {
          await interaction.deferReply({ ephemeral: true });
          
          // Set connect permission override to DENY for everyone
          await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            Connect: false
          });

          tempVoiceManager.setLocked(room.voiceId, true);

          // Update both dashboard messages to keep in sync
          await syncDashboards(interaction.guild, room, voiceChannel, textChannel, interaction.member);

          await interaction.editReply({
            embeds: [embedGenerator.success('🔒 **Voice channel locked!** Anyone who is not whitelisted cannot join.')]
          });

          await logger.info(client, '🔒 Room Locked', [
            { name: 'Room', value: `${voiceChannel.name}` },
            { name: 'Action By', value: `<@${interaction.user.id}>` }
          ]);
          break;
        }

        // ----------------------------------------
        // UNLOCK ROOM
        // ----------------------------------------
        case 'btn-unlock': {
          await interaction.deferReply({ ephemeral: true });

          // Reset connect permission override for everyone
          await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            Connect: null
          });

          tempVoiceManager.setLocked(room.voiceId, false);

          await syncDashboards(interaction.guild, room, voiceChannel, textChannel, interaction.member);

          await interaction.editReply({
            embeds: [embedGenerator.success('🔓 **Voice channel unlocked!** Anyone can now join.')]
          });

          await logger.info(client, '🔓 Room Unlocked', [
            { name: 'Room', value: `${voiceChannel.name}` },
            { name: 'Action By', value: `<@${interaction.user.id}>` }
          ]);
          break;
        }

        // ----------------------------------------
        // HIDE ROOM
        // ----------------------------------------
        case 'btn-hide': {
          await interaction.deferReply({ ephemeral: true });

          await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            ViewChannel: false
          });

          tempVoiceManager.setHidden(room.voiceId, true);

          await syncDashboards(interaction.guild, room, voiceChannel, textChannel, interaction.member);

          await interaction.editReply({
            embeds: [embedGenerator.success('👁️ **Voice channel hidden!** Non-whitelisted members can no longer see it.')]
          });

          await logger.info(client, '👁️ Room Hidden', [
            { name: 'Room', value: `${voiceChannel.name}` },
            { name: 'Action By', value: `<@${interaction.user.id}>` }
          ]);
          break;
        }

        // ----------------------------------------
        // SHOW ROOM
        // ----------------------------------------
        case 'btn-show': {
          await interaction.deferReply({ ephemeral: true });

          await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            ViewChannel: null
          });

          tempVoiceManager.setHidden(room.voiceId, false);

          await syncDashboards(interaction.guild, room, voiceChannel, textChannel, interaction.member);

          await interaction.editReply({
            embeds: [embedGenerator.success('👀 **Voice channel is now visible!** Anyone can see it.')]
          });

          await logger.info(client, '👀 Room Shown', [
            { name: 'Room', value: `${voiceChannel.name}` },
            { name: 'Action By', value: `<@${interaction.user.id}>` }
          ]);
          break;
        }

        // ----------------------------------------
        // TOGGLE PUBLIC ACCESS (LOCK SHORTCUT)
        // ----------------------------------------
        case 'btn-access': {
          await interaction.deferReply({ ephemeral: true });

          const nextStatus = !room.locked;
          await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            Connect: nextStatus ? false : null
          });

          tempVoiceManager.setLocked(room.voiceId, nextStatus);

          await syncDashboards(interaction.guild, room, voiceChannel, textChannel, interaction.member);

          const statusStr = nextStatus ? '🔒 **Locked (Private)**' : '🔓 **Unlocked (Public)**';
          await interaction.editReply({
            embeds: [embedGenerator.success(`🚪 Room access toggled! The channel is now ${statusStr}.`)]
          });

          await logger.info(client, '🚪 Room Access Toggled', [
            { name: 'Room', value: `${voiceChannel.name}` },
            { name: 'New Access', value: nextStatus ? 'Private' : 'Public' },
            { name: 'Action By', value: `<@${interaction.user.id}>` }
          ]);
          break;
        }

        // ----------------------------------------
        // VIEW ROOM INFORMATION
        // ----------------------------------------
        case 'btn-info': {
          await interaction.deferReply({ ephemeral: true });

          const infoEmbed = dashboardGenerator.generateEmbed(interaction.member, voiceChannel, room);
          infoEmbed.setTitle('ℹ️ Temporary Room Detailed Information');
          
          const membersList = voiceChannel.members.map(m => `<@${m.id}> (${m.user.tag})`).join('\n') || 'None';
          infoEmbed.addFields({ name: '👥 Connected Members', value: membersList, inline: false });

          await interaction.editReply({ embeds: [infoEmbed] });
          break;
        }

        // ----------------------------------------
        // TRANSFER OWNERSHIP DIALOG
        // ----------------------------------------
        case 'btn-transfer': {
          // Only show members currently inside the same voice channel (excluding the owner)
          const transferCandidates = voiceChannel.members.filter(m => !m.user.bot && m.id !== interaction.user.id);

          if (transferCandidates.size === 0) {
            await interaction.reply({
              embeds: [embedGenerator.error('⚠️ There are no other members in your voice channel to transfer ownership to.')],
              ephemeral: true
            });
            break;
          }

          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('menu-transfer-owner')
            .setPlaceholder('Select a member inside your room to transfer ownership...')
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(
              transferCandidates.map(m => ({
                label: (m.nickname ?? m.user.displayName ?? m.user.username).slice(0, 25),
                description: `@${m.user.username}`.slice(0, 50),
                value: m.id
              })).slice(0, 25)
            );

          const row = new ActionRowBuilder().addComponents(selectMenu);

          await interaction.reply({
            content: '👑 **Transfer ownership:** Select a member from your room below.',
            components: [row],
            ephemeral: true
          });
          break;
        }

        // ----------------------------------------
        // KICK USER DIALOG
        // ----------------------------------------
        case 'btn-kick': {
          // Only show members currently inside the same voice channel (excluding the owner)
          const kickCandidates = voiceChannel.members.filter(m => !m.user.bot && m.id !== interaction.user.id);

          if (kickCandidates.size === 0) {
            await interaction.reply({
              embeds: [embedGenerator.error('⚠️ There are no other members in your voice channel to kick.')],
              ephemeral: true
            });
            break;
          }

          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('menu-kick-user')
            .setPlaceholder('Select a member currently in your voice channel to kick...')
            .addOptions(
              kickCandidates.map(m => ({
                label: (m.nickname ?? m.user.displayName ?? m.user.username).slice(0, 25),
                description: `@${m.user.username}`.slice(0, 50),
                value: m.id
              })).slice(0, 25)
            );

          const row = new ActionRowBuilder().addComponents(selectMenu);

          await interaction.reply({
            content: '🚷 **Kick member:** Select a member from your room below.',
            components: [row],
            ephemeral: true
          });
          break;
        }

        // ----------------------------------------
        // ALLOW/WHITELIST MEMBER OR ROLE DIALOG
        // ----------------------------------------
        case 'btn-allow': {
          const selectMenu = new MentionableSelectMenuBuilder()
            .setCustomId('menu-allow-access')
            .setPlaceholder('Select a user or role to whitelist and grant room access...')
            .setMinValues(1)
            .setMaxValues(1);

          const row = new ActionRowBuilder().addComponents(selectMenu);

          await interaction.reply({
            content: '✅ **Whitelist Member/Role:** Select a member or a role from the list below.',
            components: [row],
            ephemeral: true
          });
          break;
        }

        // ----------------------------------------
        // REMOVE MEMBER ACCESS DIALOG
        // ----------------------------------------
        case 'btn-deny': {
          const selectMenu = new MentionableSelectMenuBuilder()
            .setCustomId('menu-deny-access')
            .setPlaceholder('Select a user or role to revoke access permissions...');

          const row = new ActionRowBuilder().addComponents(selectMenu);

          await interaction.reply({
            content: '❌ **Revoke Access:** Select the whitelisted user or role to remove.',
            components: [row],
            ephemeral: true
          });
          break;
        }

        // ----------------------------------------
        // MUTE/UNMUTE MEMBERS DIALOG
        // ----------------------------------------
        case 'btn-mute': {
          // Only show members currently inside the same voice channel (excluding the owner)
          const muteCandidates = voiceChannel.members.filter(m => !m.user.bot && m.id !== interaction.user.id);

          if (muteCandidates.size === 0) {
            await interaction.reply({
              embeds: [embedGenerator.error('⚠️ There are no other members in your voice channel to mute.')],
              ephemeral: true
            });
            break;
          }

          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('menu-mute-toggle')
            .setPlaceholder('Select a user in your room to server-mute or server-unmute...')
            .addOptions(
              muteCandidates.map(m => {
                const isMuted = m.voice.mute;
                return {
                  label: (m.nickname ?? m.user.displayName ?? m.user.username).slice(0, 25),
                  description: (isMuted ? '🔇 Currently Muted — click to unmute' : '🎙️ Currently Unmuted — click to mute').slice(0, 50),
                  value: m.id,
                  emoji: isMuted ? '🔇' : '🎙️'
                };
              }).slice(0, 25)
            );

          const row = new ActionRowBuilder().addComponents(selectMenu);

          await interaction.reply({
            content: '🎙️ **Mute/Unmute Members:** Select a member from your voice room.',
            components: [row],
            ephemeral: true
          });
          break;
        }

        // ----------------------------------------
        // DEAFEN/UNDEAFEN MEMBERS DIALOG
        // ----------------------------------------
        case 'btn-deafen': {
          // Only show members currently inside the same voice channel (excluding the owner)
          const deafenCandidates = voiceChannel.members.filter(m => !m.user.bot && m.id !== interaction.user.id);

          if (deafenCandidates.size === 0) {
            await interaction.reply({
              embeds: [embedGenerator.error('⚠️ There are no other members in your voice channel to deafen.')],
              ephemeral: true
            });
            break;
          }

          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('menu-deafen-toggle')
            .setPlaceholder('Select a user in your room to server-deafen or server-undeafen...')
            .addOptions(
              deafenCandidates.map(m => {
                const isDeafened = m.voice.deaf;
                return {
                  label: (m.nickname ?? m.user.displayName ?? m.user.username).slice(0, 25),
                  description: (isDeafened ? '🔕 Currently Deafened — click to undeafen' : '🔊 Currently Undeafened — click to deafen').slice(0, 50),
                  value: m.id,
                  emoji: isDeafened ? '🔕' : '🔊'
                };
              }).slice(0, 25)
            );

          const row = new ActionRowBuilder().addComponents(selectMenu);

          await interaction.reply({
            content: '🔕 **Deafen/Undeafen Members:** Select a member from your voice room.',
            components: [row],
            ephemeral: true
          });
          break;
        }
      }
      return;
    }

    // ==========================================
    // 4. HANDLE MODAL SUBMISSIONS
    // ==========================================
    if (interaction.isModalSubmit()) {
      switch (customId) {
        // ----------------------------------------
        // SUBMIT: RENAME ROOM
        // ----------------------------------------
        case 'modal-rename-room': {
          await interaction.deferReply({ ephemeral: true });
          const newName = interaction.fields.getTextInputValue('input-new-name').trim();

          if (!newName) {
            return interaction.editReply({
              embeds: [embedGenerator.error('Channel name cannot be empty.')]
            });
          }

          const oldName = voiceChannel.name;
          
          // Ensure there is always a leading emoji in the channel name
          let finalName = newName;
          let newEmoji = emojiHelper.getChannelEmoji(finalName);
          if (!newEmoji) {
            const oldEmoji = emojiHelper.getChannelEmoji(oldName) || emojiHelper.getRandomEmoji();
            newEmoji = oldEmoji;
            finalName = `${newEmoji} ${finalName}`;
          }

          await voiceChannel.setName(finalName);

          // Update server nicknames for all currently connected members in the voice room
          if (newEmoji) {
            const channelMembers = voiceChannel.members.filter(m => !m.user.bot);
            for (const [id, m] of channelMembers) {
              await emojiHelper.applyUserNicknameEmoji(m, newEmoji);
            }
          }

          await syncDashboards(interaction.guild, room, voiceChannel, textChannel, interaction.member);

          await interaction.editReply({
            embeds: [embedGenerator.success(`📝 Voice room successfully renamed to **${finalName}**.`)]
          });

          await logger.info(client, '📝 Room Renamed', [
            { name: 'Old Name', value: oldName },
            { name: 'New Name', value: finalName },
            { name: 'Action By', value: `<@${interaction.user.id}>` }
          ]);
          break;
        }

        // ----------------------------------------
        // SUBMIT: SET USER LIMIT
        // ----------------------------------------
        case 'modal-limit-room': {
          await interaction.deferReply({ ephemeral: true });
          const limitStr = interaction.fields.getTextInputValue('input-new-limit').trim();
          const limitVal = parseInt(limitStr, 10);

          if (isNaN(limitVal) || limitVal < 0 || limitVal > 99) {
            return interaction.editReply({
              embeds: [embedGenerator.error('❌ User limit must be a number between **0** (unlimited) and **99**.\n\n`0` = No limit (unlimited)\n`1–99` = Max members allowed')]
            });
          }

          const oldLimit = voiceChannel.userLimit;

          // Apply the limit to Discord — this is what creates the "00/06" counter in the sidebar
          await voiceChannel.setUserLimit(limitVal);

          // Re-fetch the channel so the cached userLimit is updated before syncing the dashboard
          const updatedVoiceChannel = await interaction.guild.channels.fetch(voiceChannel.id).catch(() => voiceChannel);

          await syncDashboards(interaction.guild, room, updatedVoiceChannel, textChannel, interaction.member);

          const newLimitStr = limitVal === 0 ? '∞ Unlimited | غير محدود' : `${limitVal} Members | عضو`;
          const oldLimitStr = oldLimit === 0 ? '∞ Unlimited' : `${oldLimit}`;

          await interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(0x10B981)
                .setTitle('👥 User Limit Updated | تم تحديث عدد الأعضاء')
                .setDescription(
                  `The voice channel member limit has been updated.\nتم تحديث حد الأعضاء في القناة الصوتية.\n\n` +
                  `**Before | قبل:** \`${oldLimitStr}\`\n` +
                  `**After | بعد:** \`${newLimitStr}\`\n\n` +
                  (limitVal > 0
                    ? `> 💡 Users will now see **\`${voiceChannel.members.size}/${limitVal}\`** in the channel list sidebar.\n> المستخدمون سيرون العداد في قائمة القنوات.`
                    : `> 💡 The channel now has **no member limit**. The counter is hidden from the sidebar.\n> القناة لا تحتوي على حد للأعضاء الآن.`)
                )
                .setTimestamp()
                .setFooter({ text: 'Temp Voice • Dev by Akaza_senior' })
            ]
          });

          await logger.info(client, '👥 Room Limit Updated', [
            { name: 'Room', value: `${voiceChannel.name}` },
            { name: 'Old Limit', value: oldLimitStr },
            { name: 'New Limit', value: newLimitStr },
            { name: 'Action By', value: `<@${interaction.user.id}>` }
          ]);
          break;
        }
      }
      return;
    }

    // ==========================================
    // 5. HANDLE SELECT MENUS
    // ==========================================
    if (interaction.isAnySelectMenu()) {
      switch (customId) {
        // ----------------------------------------
        // SELECT: TRANSFER OWNERSHIP
        // ----------------------------------------
        case 'menu-transfer-owner': {
          await interaction.deferUpdate();
          const targetId = interaction.values[0];
          
          const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
          if (!targetMember) {
            return interaction.followUp({
              embeds: [embedGenerator.error('The selected user could not be found.')],
              ephemeral: true
            });
          }

          // Owner must transfer to someone in the voice channel
          if (!voiceChannel.members.has(targetId)) {
            return interaction.followUp({
              embeds: [embedGenerator.error('⚠️ Ownership can only be transferred to a member currently inside your voice channel.')],
              ephemeral: true
            });
          }

          if (targetId === room.ownerId) {
            return interaction.followUp({
              embeds: [embedGenerator.error('⚠️ You are already the owner of this room.')],
              ephemeral: true
            });
          }

          // Execute transfer in cache
          tempVoiceManager.setOwner(room.voiceId, targetId);

          // Update text channel permissions (grant new owner full access)
          if (textChannel) {
            await textChannel.permissionOverwrites.create(targetId, {
              ViewChannel: true,
              SendMessages: true,
              ReadMessageHistory: true,
            }).catch(() => null);

            // Send confirmation banner in channel
            const noteEmbed = embedGenerator.info(
              `👑 **Room Ownership Transferred!**\n\nOwner <@${interaction.user.id}> has transferred the control dashboard to <@${targetId}>!`,
              'Ownership Transferred'
            );
            await textChannel.send({ embeds: [noteEmbed] }).catch(() => null);
          }

          // Update both dashboard messages to keep in sync
          await syncDashboards(interaction.guild, room, voiceChannel, textChannel, targetMember);

          await interaction.followUp({
            embeds: [embedGenerator.success(`👑 Ownership has been successfully handed over to <@${targetId}>!`)],
            ephemeral: true
          });

          await logger.info(client, '👑 Owner Transfer Manual', [
            { name: 'Room', value: `${voiceChannel.name}` },
            { name: 'Old Owner', value: `<@${interaction.user.id}>` },
            { name: 'New Owner', value: `<@${targetId}>` }
          ]);
          break;
        }

        // ----------------------------------------
        // SELECT: KICK USER FROM VOICE
        // ----------------------------------------
        case 'menu-kick-user': {
          await interaction.deferUpdate();
          const targetId = interaction.values[0];

          const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
          if (!targetMember) {
            return interaction.followUp({
              embeds: [embedGenerator.error('The selected user could not be found.')],
              ephemeral: true
            });
          }

          if (!voiceChannel.members.has(targetId)) {
            return interaction.followUp({
              embeds: [embedGenerator.error('⚠️ The selected user is no longer inside your voice channel.')],
              ephemeral: true
            });
          }

          if (targetId === room.ownerId) {
            return interaction.followUp({
              embeds: [embedGenerator.error('⚠️ You cannot kick yourself from your own room.')],
              ephemeral: true
            });
          }

          // Disconnect user from voice
          await targetMember.voice.disconnect('Kicked by temporary room owner').catch(() => null);

          // Revoke text channel permission overrides
          if (textChannel) {
            await textChannel.permissionOverwrites.delete(targetId).catch(() => null);
          }

          await syncDashboards(interaction.guild, room, voiceChannel, textChannel, interaction.member);

          await interaction.followUp({
            embeds: [embedGenerator.success(`🚷 Successfully kicked <@${targetId}> from your voice room.`)],
            ephemeral: true
          });

          await logger.info(client, '🚷 User Kicked from Temp Voice', [
            { name: 'Room', value: `${voiceChannel.name}` },
            { name: 'Target User', value: `<@${targetId}>` },
            { name: 'Kicked By', value: `<@${interaction.user.id}>` }
          ]);
          break;
        }

        // ----------------------------------------
        // SELECT: ALLOW/WHITELIST ACCESS
        // ----------------------------------------
        case 'menu-allow-access': {
          await interaction.deferUpdate();
          const targetId = interaction.values[0];
          const guild = interaction.guild;

          const targetRole = await guild.roles.fetch(targetId).catch(() => null);
          const targetUser = !targetRole ? await client.users.fetch(targetId).catch(() => null) : null;

          if (!targetRole && !targetUser) {
            return interaction.followUp({
              embeds: [embedGenerator.error('The selected role or user could not be resolved.')],
              ephemeral: true
            });
          }

          // Prevent whitelisting a globally blocked user/role
          if (targetUser) {
            const memberObj = await guild.members.fetch(targetId).catch(() => null);
            if (memberObj && restrictionManager.isMemberBlocked(memberObj)) {
              return interaction.followUp({
                embeds: [embedGenerator.error('⛔ This user is globally restricted by a server administrator and cannot be whitelisted.')],
                ephemeral: true
              });
            }
            // Add user to whitelist
            tempVoiceManager.allowUser(room.voiceId, targetId);
          } else {
            if (restrictionManager.isRoleBlocked(targetId)) {
              return interaction.followUp({
                embeds: [embedGenerator.error('⛔ This role is globally restricted by a server administrator and cannot be whitelisted.')],
                ephemeral: true
              });
            }
            // Add role to whitelist
            tempVoiceManager.allowRole(room.voiceId, targetId);
          }

          // Modify physical permissions of the voice channel to ALLOW connect/view
          await voiceChannel.permissionOverwrites.create(targetId, {
            ViewChannel: true,
            Connect: true
          });

          // If whitelisted user, grant text channel access
          if (targetUser && textChannel) {
            await textChannel.permissionOverwrites.create(targetId, {
              ViewChannel: true,
              ReadMessageHistory: true,
              SendMessages: true,
            }).catch(() => null);
          }

          await syncDashboards(interaction.guild, room, voiceChannel, textChannel, interaction.member);

          const whitelistName = targetRole ? `role **${targetRole.name}**` : `<@${targetId}>`;
          await interaction.followUp({
            embeds: [embedGenerator.success(`✅ Successfully whitelisted ${whitelistName}. They can now view and join this room.`)],
            ephemeral: true
          });

          await logger.log(client, '✅ Room Whitelist Add', [
            { name: 'Room', value: `${voiceChannel.name}` },
            { name: 'Whitelisted', value: whitelistName },
            { name: 'Action By', value: `<@${interaction.user.id}>` }
          ]);
          break;
        }

        // ----------------------------------------
        // SELECT: DENY/REVOKE ACCESS
        // ----------------------------------------
        case 'menu-deny-access': {
          await interaction.deferUpdate();
          const targetId = interaction.values[0];

          // Check if it is whitelisted in memory
          const isUser = room.whitelistedUsers.has(targetId);
          const isRole = room.whitelistedRoles.has(targetId);

          if (!isUser && !isRole) {
            return interaction.followUp({
              embeds: [embedGenerator.error('⚠️ The selected user or role is not currently in this room\'s whitelist.')],
              ephemeral: true
            });
          }

          if (targetId === room.ownerId) {
            return interaction.followUp({
              embeds: [embedGenerator.error('⚠️ You cannot revoke whitelist access from yourself.')],
              ephemeral: true
            });
          }

          // Clear override permissions on the physical channel
          await voiceChannel.permissionOverwrites.delete(targetId).catch(() => null);

          if (isUser) {
            tempVoiceManager.denyUser(room.voiceId, targetId);
            
            // Revoke text channel access
            if (textChannel) {
              await textChannel.permissionOverwrites.delete(targetId).catch(() => null);
            }
            
            // Kick them if they are currently in the channel
            if (voiceChannel.members.has(targetId)) {
              const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
              if (targetMember) {
                await targetMember.voice.disconnect('Access revoked by owner').catch(() => null);
              }
            }
          } else {
            tempVoiceManager.denyRole(room.voiceId, targetId);
          }

          await syncDashboards(interaction.guild, room, voiceChannel, textChannel, interaction.member);

          await interaction.followUp({
            embeds: [embedGenerator.success(`❌ Successfully revoked access overrides for <@${targetId}> / <@&${targetId}>.`)],
            ephemeral: true
          });

          await logger.log(client, '❌ Room Whitelist Revoke', [
            { name: 'Room', value: `${voiceChannel.name}` },
            { name: 'Revoked', value: `<@${targetId}> / <@&${targetId}>` },
            { name: 'Action By', value: `<@${interaction.user.id}>` }
          ]);
          break;
        }

        // ----------------------------------------
        // SELECT: MUTE / UNMUTE MEMBER
        // ----------------------------------------
        case 'menu-mute-toggle': {
          await interaction.deferUpdate();
          const targetId = interaction.values[0];

          const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
          if (!targetMember) {
            return interaction.followUp({
              embeds: [embedGenerator.error('The selected user could not be found.')],
              ephemeral: true
            });
          }

          if (!voiceChannel.members.has(targetId)) {
            return interaction.followUp({
              embeds: [embedGenerator.error('⚠️ The selected user is not inside your voice channel.')],
              ephemeral: true
            });
          }

          if (targetId === room.ownerId) {
            return interaction.followUp({
              embeds: [embedGenerator.error('⚠️ You cannot server-mute yourself.')],
              ephemeral: true
            });
          }

          const currentMuteStatus = targetMember.voice.mute;
          await targetMember.voice.setMute(!currentMuteStatus, 'Toggled by room owner control panel').catch(() => null);

          const statusStr = !currentMuteStatus ? 'Server Muted' : 'Server Unmuted';

          await interaction.followUp({
            embeds: [embedGenerator.success(`🎙️ Successfully **${statusStr}** <@${targetId}> in your voice channel.`)],
            ephemeral: true
          });

          await logger.info(client, '🎙️ Mute State Toggled', [
            { name: 'Room', value: `${voiceChannel.name}` },
            { name: 'Target', value: `<@${targetId}>` },
            { name: 'New State', value: statusStr },
            { name: 'Action By', value: `<@${interaction.user.id}>` }
          ]);
          break;
        }

        // ----------------------------------------
        // SELECT: DEAFEN / UNDEAFEN MEMBER
        // ----------------------------------------
        case 'menu-deafen-toggle': {
          await interaction.deferUpdate();
          const targetId = interaction.values[0];

          const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
          if (!targetMember) {
            return interaction.followUp({
              embeds: [embedGenerator.error('The selected user could not be found.')],
              ephemeral: true
            });
          }

          if (!voiceChannel.members.has(targetId)) {
            return interaction.followUp({
              embeds: [embedGenerator.error('⚠️ The selected user is not inside your voice channel.')],
              ephemeral: true
            });
          }

          if (targetId === room.ownerId) {
            return interaction.followUp({
              embeds: [embedGenerator.error('⚠️ You cannot server-deafen yourself.')],
              ephemeral: true
            });
          }

          const currentDeafenStatus = targetMember.voice.deaf;
          await targetMember.voice.setDeaf(!currentDeafenStatus, 'Toggled by room owner control panel').catch(() => null);

          const statusStr = !currentDeafenStatus ? 'Server Deafened' : 'Server Undeafened';

          await interaction.followUp({
            embeds: [embedGenerator.success(`🔕 Successfully **${statusStr}** <@${targetId}> in your voice channel.`)],
            ephemeral: true
          });

          await logger.info(client, '🔕 Deafen State Toggled', [
            { name: 'Room', value: `${voiceChannel.name}` },
            { name: 'Target', value: `<@${targetId}>` },
            { name: 'New State', value: statusStr },
            { name: 'Action By', value: `<@${interaction.user.id}>` }
          ]);
          break;
        }
      }
    }

    // ==========================================
    // MUSIC PLAYER BUTTON CONTROLS
    // ==========================================

    // ── ⏸ Pause / Resume Button ──
    if (interaction.isButton() && customId === 'music_pause_resume') {
      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel) {
        return interaction.reply({ embeds: [embedGenerator.error('You must be in a voice channel.')], ephemeral: true });
      }

      const queue = musicManager.getQueue(interaction.guildId);
      if (!queue || !queue.isPlaying) {
        return interaction.reply({ embeds: [embedGenerator.error('No music is currently playing.')], ephemeral: true });
      }

      if (queue.voiceChannelId !== voiceChannel.id) {
        return interaction.reply({ embeds: [embedGenerator.error('You must be in the same voice channel as the bot.')], ephemeral: true });
      }

      if (queue.isPaused) {
        queue.player.unpause();
        queue.isPaused = false;
        return interaction.reply({ embeds: [embedGenerator.success('▶️ Resumed the music.')], ephemeral: true });
      } else {
        queue.player.pause();
        queue.isPaused = true;
        return interaction.reply({ embeds: [embedGenerator.success('⏸️ Paused the music.')], ephemeral: true });
      }
    }

    // ── ⏭ Skip Button ──
    if (interaction.isButton() && customId === 'music_skip') {
      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel) {
        return interaction.reply({ embeds: [embedGenerator.error('You must be in a voice channel.')], ephemeral: true });
      }

      const queue = musicManager.getQueue(interaction.guildId);
      if (!queue || !queue.isPlaying) {
        return interaction.reply({ embeds: [embedGenerator.error('No music is currently playing.')], ephemeral: true });
      }

      if (queue.voiceChannelId !== voiceChannel.id) {
        return interaction.reply({ embeds: [embedGenerator.error('You must be in the same voice channel as the bot.')], ephemeral: true });
      }

      musicManager.playNext(interaction.guildId);
      return interaction.reply({ embeds: [embedGenerator.success('⏭️ Skipped to the next song.')], ephemeral: true });
    }

    // ── ⏹ Stop Button ──
    if (interaction.isButton() && customId === 'music_stop') {
      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel) {
        return interaction.reply({ embeds: [embedGenerator.error('You must be in a voice channel.')], ephemeral: true });
      }

      const queue = musicManager.getQueue(interaction.guildId);
      if (!queue) {
        return interaction.reply({ embeds: [embedGenerator.error('No music is currently playing.')], ephemeral: true });
      }

      if (queue.voiceChannelId !== voiceChannel.id) {
        return interaction.reply({ embeds: [embedGenerator.error('You must be in the same voice channel as the bot.')], ephemeral: true });
      }

      musicManager.destroyQueue(interaction.guildId);
      return interaction.reply({ embeds: [embedGenerator.success('⏹️ Stopped playback and disconnected.')], ephemeral: true });
    }

    // ── 📋 Queue Button ──
    if (interaction.isButton() && customId === 'music_queue') {
      const queue = musicManager.getQueue(interaction.guildId);
      if (!queue || (!queue.currentSong && queue.songs.length === 0)) {
        return interaction.reply({ embeds: [embedGenerator.info('The queue is currently empty.', '🎵 Queue Empty')], ephemeral: true });
      }

      const ITEMS_PER_PAGE = 8;
      const pageItems = queue.songs.slice(0, ITEMS_PER_PAGE);
      const nowPlayingLine = queue.currentSong
        ? `🎶 **Now Playing:**\n> **${queue.currentSong.title}**\n> ⏱️ \`${queue.currentSong.duration}\`\n\n`
        : '';

      const queueLines = pageItems.map((song, i) =>
        `\`${i + 1}.\` **${song.title.length > 45 ? song.title.slice(0, 42) + '...' : song.title}** — \`${song.duration}\``
      ).join('\n');

      const queueEmbed = new EmbedBuilder()
        .setColor(0x8B5CF6)
        .setTitle('🎵 Music Queue')
        .setDescription(
          nowPlayingLine +
          (queue.songs.length > 0
            ? `**Up Next (${queue.songs.length} song${queue.songs.length !== 1 ? 's' : ''}):**\n${queueLines}` +
              (queue.songs.length > ITEMS_PER_PAGE ? `\n\n*...and ${queue.songs.length - ITEMS_PER_PAGE} more. Use \`/queue\` to see all.*` : '')
            : '`No more songs queued.`')
        )
        .setFooter({ text: 'Community Zone • Music System' })
        .setTimestamp();

      return interaction.reply({ embeds: [queueEmbed], ephemeral: true });
    }

    // ==========================================
    // 🎮 GAMING ROLE PANEL — Self-assign toggle
    // ==========================================
    if (interaction.isButton() && customId.startsWith('game_role_')) {
      await interaction.deferReply({ ephemeral: true });

      const gameId  = customId.slice('game_role_'.length);          // e.g. "valorant"
      const gameMeta = GAME_LIST.find(g => g.id === gameId);

      if (!gameMeta) {
        return interaction.editReply({ content: '❌ Unknown game role. Please contact an admin.' });
      }

      const roleName = `╔════ ${gameMeta.emoji} 𝐆𝐀𝐌𝐄𝐑 ════╗`.replace('𝐆𝐀𝐌𝐄𝐑', gameMeta.label);
      const guild    = interaction.guild;
      const member   = interaction.member;

      // ── Find or auto-create the role ──────────────────────
      let role = guild.roles.cache.find(r => r.name === roleName);
      if (!role) {
        try {
          role = await guild.roles.create({
            name: roleName,
            mentionable: true,
            reason: `Auto-created by Gaming Role Panel for: ${gameMeta.label}`,
          });
        } catch (err) {
          console.error('[GAME ROLE PANEL] Failed to create role:', err);
          return interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(0xEF4444)
                .setTitle('❌ Role Creation Failed')
                .setDescription(
                  'Could not auto-create the game role. Make sure the bot has **Manage Roles** permission and its role is high enough.\n' +
                  'تعذّر إنشاء الرتبة. تأكد من أن البوت يملك صلاحية **إدارة الرتب** ورتبته أعلى.'
                )
                .setFooter({ text: 'Community Zone • Dev by Akaza_senior' })
                .setTimestamp(),
            ],
          });
        }
      }

      // ── Toggle: add if not present, remove if already has ─
      const hasRole = member.roles.cache.has(role.id);
      try {
        if (hasRole) {
          await member.roles.remove(role, `Gaming Role Panel: removed ${gameMeta.label}`);
        } else {
          await member.roles.add(role, `Gaming Role Panel: assigned ${gameMeta.label}`);
        }
      } catch (err) {
        console.error('[GAME ROLE PANEL] Failed to toggle role:', err);
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xEF4444)
              .setTitle('❌ Failed to Update Role | فشل تحديث الرتبة')
              .setDescription(
                'Could not update your role. The bot role may be below the game role in the hierarchy.\n' +
                'تعذّر تحديث رتبتك. قد تكون رتبة البوت أدنى من رتبة اللعبة في التسلسل الهرمي.'
              )
              .setFooter({ text: 'Community Zone • Dev by Akaza_senior' })
              .setTimestamp(),
          ],
        });
      }

      // ── Bilingual success reply ────────────────────────────
      const assigned = !hasRole; // after toggle, if previously didn't have → now assigned
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(assigned ? 0x10B981 : 0xF59E0B)
            .setTitle(
              assigned
                ? `✅ Role Assigned | تمت إضافة الرتبة`
                : `🗑️ Role Removed | تمت إزالة الرتبة`
            )
            .setDescription(
              assigned
                ? `You have been given the **${gameMeta.emoji} ${gameMeta.label}** role!\nتمت إضافة رتبة **${gameMeta.emoji} ${gameMeta.label}** إلى حسابك!`
                : `The **${gameMeta.emoji} ${gameMeta.label}** role has been removed from your profile.\nتمت إزالة رتبة **${gameMeta.emoji} ${gameMeta.label}** من حسابك.`
            )
            .setFooter({ text: 'Community Zone • Dev by Akaza_senior' })
            .setTimestamp(),
        ],
      });
  }

    // ==========================================
    // 💌 ANONYMOUS CONFESSIONS SYSTEM
    // ==========================================

    // ── Modal submit: user sent a confession ──────────────────────────────────
    if (interaction.isModalSubmit() && customId === 'confess_modal_submit') {
      const confessCmd = require('../../commands/general/confess');
      const userId  = interaction.user.id;
      const now     = Date.now();

      await interaction.deferReply({ ephemeral: true });

      const { getSafeEmoji } = require('../../utils/emojiHelper');

      try {
        // Re-check cooldown (modal submit is a separate interaction)
        const last = confessCmd.cooldowns.get(userId) || 0;
        if (now - last < confessCmd.COOLDOWN_MS) {
          const remaining = Math.ceil((confessCmd.COOLDOWN_MS - (now - last)) / 1000);
          return interaction.editReply({
            embeds: [embedGenerator.error(`${getSafeEmoji('warning', client, false)} الرجاء الانتظار **${remaining} ثانية** قبل إرسال رسالة جديدة.`) ]
          });
        }

        const rawMessage = interaction.fields.getTextInputValue('confess_message_input').trim();

        // ── Content filter ──────────────────────────────────────────────────────
        for (const pattern of confessCmd.BLOCKED_PATTERNS) {
          if (pattern.test(rawMessage)) {
            return interaction.editReply({
              embeds: [embedGenerator.error(`${getSafeEmoji('error', client, false)} **رسالتك تحتوي على رابط أو إعلان ممنوع.**\n*(Your message contains a blocked link or advertisement.)*`) ]
            });
          }
        }

        // ── Channel check ───────────────────────────────────────────────────────
        const confessChannelId = config.confessChannelId;
        if (!confessChannelId) {
          return interaction.editReply({
            embeds: [embedGenerator.error(`${getSafeEmoji('error', client, false)} لم يتم إعداد قناة الرسائل المجهولة بعد. الرجاء التواصل مع الإدارة.\n*(Anonymous messages channel not configured yet.)*`) ]
          });
        }

        const confessChannel = await client.channels.fetch(confessChannelId).catch(() => null);
        if (!confessChannel || !confessChannel.isTextBased()) {
          return interaction.editReply({
            embeds: [embedGenerator.error(`${getSafeEmoji('error', client, false)} تعذّر الوصول إلى قناة الرسائل المجهولة. الرجاء التواصل مع الإدارة.`) ]
          });
        }

        // ── Reserve ID & update cooldown ─────────────────────────────────────────
        const confessionId = confessManager.nextConfessionId();
        confessCmd.cooldowns.set(userId, now);

        // ── Build public confession embed ─────────────────────────────────────────
        const publicEmbed = new EmbedBuilder()
          .setColor(config.colors.accent || 0x8B5CF6)
          .setTitle(`Anonymous Message #${confessionId}`)
          .setDescription(`${getSafeEmoji('info', client, false)} > ${rawMessage}`)
          .setFooter({ text: `Community Zone TN • رسالة مجهولة #${confessionId}` })
          .setTimestamp();

        // ── Reaction buttons ──────────────────────────────────────────────────────
        const reactionRow1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`confess_react_love_${confessionId}`).setLabel('Love').setEmoji(getSafeEmoji('confess_love', client)).setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`confess_react_sad_${confessionId}`).setLabel('Sad').setEmoji(getSafeEmoji('confess_sad', client)).setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`confess_react_haha_${confessionId}`).setLabel('Haha').setEmoji(getSafeEmoji('confess_haha', client)).setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`confess_react_angry_${confessionId}`).setLabel('Angry').setEmoji(getSafeEmoji('confess_angry', client)).setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`confess_react_wow_${confessionId}`).setLabel('Wow').setEmoji(getSafeEmoji('confess_wow', client)).setStyle(ButtonStyle.Secondary)
        );

        const reactionRow2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`confess_comment_${confessionId}`).setLabel('Add Comment | إضافة تعليق').setEmoji(getSafeEmoji('confess_comment', client)).setStyle(ButtonStyle.Primary)
        );

        const published = await confessChannel.send({ embeds: [publicEmbed], components: [reactionRow1, reactionRow2] });

        // Register for reaction tracking
        confessManager.registerMessage(published.id, confessionId);

        // ── Mod log: send to ALL configured log channels ───────────────────────
        const logChannelIds = [
          config.logChannelId,
          config.warnChannelId,
          config.trackerLogChannelId,
          config.confessLogChannelId,
        ].filter(id => id && id !== 'YOUR_LOG_CHANNEL_ID_HERE');

        const modEmbed = new EmbedBuilder()
          .setColor(config.colors.warning || 0xF59E0B)
          .setTitle(`Confession #${confessionId} — Mod Log`)
          .setDescription(`${getSafeEmoji('info', client, false)} > ${rawMessage}`)
          .addFields(
            { name: '👤 Sender',     value: `<@${userId}> (\`${interaction.user.tag}\` — \`${userId}\`)`, inline: false },
            { name: '📣 Published',  value: `[Jump to message](${published.url})`, inline: false },
            { name: '🕐 Timestamp', value: `<t:${Math.floor(now / 1000)}:F>`, inline: false }
          )
          .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: 'Community Zone • Confessions Mod Log' })
          .setTimestamp();

        const uniqueLogIds = [...new Set(logChannelIds)];
        for (const logId of uniqueLogIds) {
          const logCh = await client.channels.fetch(logId).catch(() => null);
          if (logCh && logCh.isTextBased()) {
            await logCh.send({ embeds: [modEmbed] }).catch(() => null);
          }
        }

        return interaction.editReply({
          embeds: [embedGenerator.success(`${getSafeEmoji('success', client, false)} **تم إرسال رسالتك المجهولة بنجاح!** (#${confessionId})\n*(Your anonymous message has been published successfully!)*`)]
        });
      } catch (err) {
        console.error('[CONFESSION ERROR]', err);
        return interaction.editReply({
          embeds: [embedGenerator.error(`Something went wrong while submitting your confession. Please try again later.\n\nحدث خطأ ما أثناء إرسال رسالتك المجهولة. يرجى المحاولة لاحقاً.`)]
        });
      }
    }

    // ── Reaction buttons on a confession ────────────────────────────────────
    if (interaction.isButton() && customId.startsWith('confess_react_')) {
      const { getSafeEmoji } = require('../../utils/emojiHelper');
      // customId format: confess_react_<emoji>_<confessionId>
      const parts      = customId.split('_');  // ['confess','react','love','152']
      const emojiKey   = parts[2]; // love | sad | haha | angry | wow
      const confessionId = parseInt(parts[3], 10);

      const VALID_KEYS = ['love', 'sad', 'haha', 'angry', 'wow'];
      if (!VALID_KEYS.includes(emojiKey)) return;

      const msgId  = interaction.message.id;
      const userId = interaction.user.id;
      const result = confessManager.toggleReaction(msgId, userId, emojiKey);

      if (!result) {
        return interaction.reply({ content: `${getSafeEmoji('error', client, false)} هذه الرسالة غير مسجلة في النظام.`, ephemeral: true });
      }

      const { counts } = result;

      // Rebuild buttons with updated counts
      const makeBtn = (key, label) => {
        const count = counts[key];
        const labelText = count > 0 ? `${label} ${count}` : label;
        return new ButtonBuilder()
          .setCustomId(`confess_react_${key}_${confessionId}`)
          .setLabel(labelText)
          .setEmoji(getSafeEmoji(`confess_${key}`, client))
          .setStyle(result.added === key ? ButtonStyle.Primary : ButtonStyle.Secondary);
      };

      const updatedRow = new ActionRowBuilder().addComponents(
        makeBtn('love',  'Love'),
        makeBtn('sad',   'Sad'),
        makeBtn('haha',  'Haha'),
        makeBtn('angry', 'Angry'),
        makeBtn('wow',   'Wow')
      );

      const row2 = interaction.message.components[1] ? ActionRowBuilder.from(interaction.message.components[1]) : null;
      const components = row2 ? [updatedRow, row2] : [updatedRow];
      await interaction.update({ components });

      // Provide ephemeral feedback
      const added = result.added;
      const feedbackMsg = added
        ? `تم تسجيل تفاعلك **${getSafeEmoji(`confess_${added}`, client, false)}** على الرسالة #${confessionId}.`
        : `تم إلغاء تفاعلك على الرسالة #${confessionId}.`;

      return interaction.followUp({ content: feedbackMsg, ephemeral: true });
    }

    // ── Click "Add Comment" button ──────────────────────────────────────────
    if (interaction.isButton() && customId.startsWith('confess_comment_')) {
      const confessionId = customId.split('_')[2];
      const modal = new ModalBuilder()
        .setCustomId(`confess_comment_modal_${confessionId}`)
        .setTitle('Anonymous Comment | تعليق مجهول');

      const commentInput = new TextInputBuilder()
        .setCustomId('confess_comment_input')
        .setLabel('تعليقك المجهول | Anonymous Comment')
        .setPlaceholder('اكتب تعليقك هنا... / Write your comment here...')
        .setStyle(TextInputStyle.Paragraph)
        .setMinLength(3)
        .setMaxLength(500)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(commentInput));
      return interaction.showModal(modal);
    }

    // ── Submit Comment Modal ─────────────────────────────────────────────────
    if (interaction.isModalSubmit() && customId.startsWith('confess_comment_modal_')) {
      const confessionId = customId.split('_')[3];
      const rawComment = interaction.fields.getTextInputValue('confess_comment_input').trim();
      const confessCmd = require('../../commands/general/confess');

      const { getSafeEmoji } = require('../../utils/emojiHelper');

      // Link/promo check
      for (const pattern of confessCmd.BLOCKED_PATTERNS) {
        if (pattern.test(rawComment)) {
          return interaction.reply({
            content: `${getSafeEmoji('error', client, false)} **تعليقك يحتوي على رابط أو إعلان ممنوع.**\n*(Your comment contains a blocked link or advertisement.)*`,
            ephemeral: true,
          });
        }
      }

      await interaction.deferReply({ ephemeral: true });

      const message = interaction.message;
      let thread = message.thread;
      if (!thread) {
        try {
          thread = await message.startThread({
            name: `Comments • Confession #${confessionId}`,
            autoArchiveDuration: 1440,
            reason: `Comments for anonymous message #${confessionId}`
          });
        } catch (err) {
          console.error('[CONFESS COMMENT] Failed to start thread:', err);
          return interaction.editReply({
            content: `${getSafeEmoji('error', client, false)} فشل إنشاء موضوع للتعليقات. تأكد من صلاحيات البوت لإدارة المواضيع (Manage Threads).`
          });
        }
      }

      // Send anonymous comment embed into thread
      const commentEmbed = new EmbedBuilder()
        .setColor(config.colors.accent || 0x8B5CF6)
        .setDescription(`${getSafeEmoji('confess_comment', client, false)} **تعليق مجهول:**\n\n> ${rawComment}`)
        .setFooter({ text: `Community Zone TN • تعليق مجهول` })
        .setTimestamp();

      const commentMsg = await thread.send({ embeds: [commentEmbed] }).catch(() => null);

      if (!commentMsg) {
        return interaction.editReply({
          content: `${getSafeEmoji('error', client, false)} فشل إرسال التعليق في موضوع التعليقات.`
        });
      }

      // Log to mod channels
      const logChannelIds = [
        config.logChannelId,
        config.warnChannelId,
        config.trackerLogChannelId,
        config.confessLogChannelId,
      ].filter(id => id && id !== 'YOUR_LOG_CHANNEL_ID_HERE');

      const modEmbed = new EmbedBuilder()
        .setColor(config.colors.warning || 0xF59E0B)
        .setTitle(`Comment on Confession #${confessionId} — Mod Log`)
        .setDescription(`${getSafeEmoji('confess_comment', client, false)} > ${rawComment}`)
        .addFields(
          { name: '👤 Sender',     value: `<@${interaction.user.id}> (\`${interaction.user.tag}\` — \`${interaction.user.id}\`)`, inline: false },
          { name: '📣 Origin Post', value: `[Confession Message](${message.url})`, inline: true },
          { name: '💬 Thread Link', value: `[Jump to comment](${commentMsg.url})`, inline: true },
          { name: '🕐 Timestamp',   value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        )
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'Community Zone • Comments Mod Log' })
        .setTimestamp();

      const uniqueLogIds = [...new Set(logChannelIds)];
      for (const logId of uniqueLogIds) {
        const logCh = await client.channels.fetch(logId).catch(() => null);
        if (logCh && logCh.isTextBased()) {
          await logCh.send({ embeds: [modEmbed] }).catch(() => null);
        }
      }

      return interaction.editReply({
        content: `${getSafeEmoji('success', client, false)} **تم نشر تعليقك المجهول بنجاح!** [انتقل إلى الموضوع](${commentMsg.url})`
      });
    }
  }
};
