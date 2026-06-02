const { PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config');
const tempVoiceManager = require('../../managers/tempVoice');
const restrictionManager = require('../../managers/restriction');
const dashboardGenerator = require('../../utils/dashboard');
const logger = require('../../utils/logger');
const embedGenerator = require('../../utils/embedGenerator');
const emojiHelper = require('../../utils/nicknameEmojiHelper');

module.exports = {
  name: 'voiceStateUpdate',
  once: false,
  async execute(client, oldState, newState) {
    const member = newState.member;
    if (!member || member.user.bot) return;

    // ── MUSIC BOT ALONE CLEANUP ──
    // Players are now keyed by voiceChannelId (multi-room support)
    const musicManager = require('../../managers/musicManager');
    if (oldState.channelId && oldState.channelId !== newState.channelId) {
      const player = musicManager.getPlayer(oldState.channelId);
      if (player) {
        const humanMembers = oldState.channel?.members?.filter(m => !m.user.bot);
        if (humanMembers && humanMembers.size === 0) {
          console.log(`[MUSIC MANAGER] Bot left alone in voice channel ${oldState.channel.name}. Disconnecting.`);
          musicManager.destroyPlayer(oldState.channelId);
        }
      }
    }

    const triggerId = config.triggerChannelId;
    const categoryId = config.tempCategoryId;

    // Proactive / Failsafe Nickname Restoration:
    // If the member is not in ANY voice channel, ensure their name is restored to original state.
    if (!newState.channelId) {
      await emojiHelper.restoreOriginalNickname(member);
    }

    // ==========================================
    // 1. DYNAMIC VOICE CHANNEL CREATION TRIGGER
    // ==========================================
    const isTrigger = newState.channelId === triggerId || (newState.channel && newState.channel.name === '🎧・𝐉𝐨𝐢𝐧 𝐓𝐨 𝐂𝐫𝐞𝐚𝐭𝐞');
    if (isTrigger && oldState.channelId !== newState.channelId) {
      // Check if user is globally blocked BEFORE creating anything
      if (restrictionManager.isMemberBlocked(member)) {
        try {
          await member.voice.disconnect('Globally blocked from voice systems');
          const dmEmbed = embedGenerator.error(
            'You are globally blocked from using the temporary voice systems on this server by an administrator.',
            '⛔ Access Blocked'
          );
          await member.send({ embeds: [dmEmbed] }).catch(() => null);
          await logger.warning(client, 'Block Bypass Attempted', [
            { name: 'User', value: `${member.user.tag} (<@${member.id}>)` },
            { name: 'Action', value: 'Attempted to join trigger voice channel' }
          ]);
        } catch (e) {
          console.error('[VOICE UPDATE] Error handling blocked user trigger join:', e);
        }
        return;
      }

      // Prevent simultaneous double creations
      if (!tempVoiceManager.acquireLock(member.id)) return;

      try {
        const guild = newState.guild;
        const triggerChannel = newState.channel;

        // Find category: use config value, or fallback to the category of the trigger channel
        let targetCategory = null;
        if (categoryId && categoryId !== 'YOUR_CATEGORY_ID_HERE') {
          targetCategory = await guild.channels.fetch(categoryId).catch(() => null);
        }
        if (!targetCategory && triggerChannel.parentId) {
          targetCategory = triggerChannel.parent;
        }

        const randomEmoji = emojiHelper.getRandomEmoji();
        const displayName = member.nickname ?? member.user.displayName ?? member.user.username;
        const voiceName = `${randomEmoji} ${displayName}`;

        console.log(`[TEMP VOICE] Creating temporary room for ${member.user.tag}...`);

        // ── Roles that are NEVER allowed to see or join temp voice channels ──────
        // Role IDs: Unverified ⚠️🔒 (1508980786949390460)
        //           Waiting For Interview ⏳🎤 (1509002153426030675)
        const BLOCKED_ROLE_IDS = ['1508980786949390460', '1509002153426030675'];

        // Define permission overwrites dynamically
        const permissionOverwrites = [
          {
            id: guild.id, // @everyone
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
          },
          {
            id: member.id, // Creator / Owner
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.Speak,
              PermissionFlagsBits.MuteMembers,
              PermissionFlagsBits.MoveMembers,
            ]
          }
        ];

        // Deny ViewChannel + Connect for each restricted role
        for (const roleId of BLOCKED_ROLE_IDS) {
          permissionOverwrites.push({
            id: roleId,
            deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
          });
        }

        // Create Voice Channel ONLY (no separate text channel)
        const voiceChannel = await guild.channels.create({
          name: voiceName,
          type: ChannelType.GuildVoice,
          parent: targetCategory ? targetCategory.id : null,
          permissionOverwrites
        });

        // Move Member to the new voice channel
        await member.voice.setChannel(voiceChannel).catch(async (e) => {
          console.warn(`[TEMP VOICE] Failed to move ${member.user.tag} to new voice. Cleaning up...`);
          await voiceChannel.delete().catch(() => null);
          tempVoiceManager.releaseLock(member.id);
          throw e;
        });

        // Register room in memory (no textId needed — use voiceId as textId placeholder)
        const room = tempVoiceManager.createRoom(voiceChannel.id, voiceChannel.id, member.id);
        tempVoiceManager.releaseLock(member.id);

        // Apply emoji prefix to owner's server nickname
        await emojiHelper.applyUserNicknameEmoji(member, randomEmoji);

        // Schedule deletion in 15 seconds in case it remains empty (e.g. user fails to join or leaves instantly)
        const initTimeout = setTimeout(async () => {
          const checkVoice = await guild.channels.fetch(voiceChannel.id).catch(() => null);
          if (checkVoice && checkVoice.members.size === 0) {
            console.log(`[TEMP VOICE] Room empty after creation grace period. Deleting: ${checkVoice.name}...`);
            await checkVoice.delete().catch(() => null);
            tempVoiceManager.deleteRoom(voiceChannel.id);
            tempVoiceManager.clearDeletion(voiceChannel.id);
            await logger.info(client, '🔴 Temporary Room Deleted', [
              { name: 'Voice Channel', value: `${voiceChannel.name} (\`${voiceChannel.id}\`)` },
              { name: 'Reason', value: 'Room was empty after creation (15s grace period ended).' }
            ]);
          } else {
            tempVoiceManager.clearDeletion(voiceChannel.id);
          }
        }, 15000);
        tempVoiceManager.scheduleDeletion(voiceChannel.id, initTimeout);

        // Build & send the dashboard ONLY in the voice channel built-in text chat
        const embed = dashboardGenerator.generateEmbed(member, voiceChannel, room);
        const components = dashboardGenerator.generateButtons();

        const voiceDashboardMsg = await voiceChannel.send({
          content: `👑 Voice Room Control Panel for <@${member.id}>:`,
          embeds: [embed],
          components: components,
          files: [dashboardGenerator.getBannerAttachment()]
        }).catch(() => null);

        if (voiceDashboardMsg) {
          await voiceDashboardMsg.pin().catch(() => null);
          room.voiceDashboardMessageId = voiceDashboardMsg.id;
        }

        // Log the successful creation
        await logger.success(client, '🟢 Temporary Room Created', [
          { name: 'Creator/Owner', value: `${member.user.tag} (<@${member.id}>)` },
          { name: 'Voice Channel', value: `${voiceChannel.name} (\`${voiceChannel.id}\`)` }
        ]);

      } catch (error) {
        console.error('[TEMP VOICE ERROR] Dynamic creation process failed:', error);
        tempVoiceManager.releaseLock(member.id);
      }
      return;
    }

    // ==========================================
    // 2. DYNAMIC VOICE CHANNEL LIFECYCLE MANAGEMENT
    // ==========================================

    // Check if the user LEFT a temporary channel (ignore mute/deafen state changes in the same channel)
    if (oldState.channelId && oldState.channelId !== newState.channelId) {
      const voiceId = oldState.channelId;
      const voiceChannel = oldState.channel || await oldState.guild.channels.fetch(voiceId).catch(() => null);

      if (voiceChannel) {
        const isTempChannel = tempVoiceManager.getRoomByVoiceId(voiceId) ||
          (categoryId && voiceChannel.parentId === categoryId && voiceId !== triggerId);

        if (isTempChannel) {
          const room = tempVoiceManager.getRoomByVoiceId(voiceId);

          // Restore original nickname on leave
          await emojiHelper.restoreOriginalNickname(member);

          // Fetch the channel fresh to avoid cache latency issues
          const freshVoiceChannel = await oldState.guild.channels.fetch(voiceId).catch(() => voiceChannel);
          const realRemainingMembers = freshVoiceChannel.members.filter(m => m.id !== member.id);
          const hasHumans = realRemainingMembers.some(m => !m.user.bot);

          // A: Check if the room has no human members left → Schedule deletion in 15 seconds
          if (!hasHumans) {
            console.log(`[TEMP VOICE] Room empty of humans. Scheduling deletion in 15 seconds for ${freshVoiceChannel.name}...`);
            tempVoiceManager.cancelDeletion(voiceId);

            const timeoutObj = setTimeout(async () => {
              const checkVoice = await oldState.guild.channels.fetch(voiceId).catch(() => null);
              const checkHumans = checkVoice ? checkVoice.members.some(m => !m.user.bot) : false;
              if (checkVoice && !checkHumans) {
                console.log(`[TEMP VOICE] Grace period ended. Deleting room: ${checkVoice.name}...`);
                await checkVoice.delete().catch(() => null);
                tempVoiceManager.deleteRoom(voiceId);
                tempVoiceManager.clearDeletion(voiceId);
                await logger.info(client, '🔴 Temporary Room Deleted', [
                  { name: 'Voice Channel', value: `${freshVoiceChannel.name} (\`${freshVoiceChannel.id}\`)` },
                  { name: 'Reason', value: 'Room became empty of humans (15s grace period ended).' }
                ]);
              } else {
                tempVoiceManager.clearDeletion(voiceId);
              }
            }, 15000);

            tempVoiceManager.scheduleDeletion(voiceId, timeoutObj);
          }
          // B: Owner left but other humans are still inside → Start a 30-second ownership election
          else if (room && member.id === room.ownerId) {
            const remainingMembers = realRemainingMembers.filter(m => !m.user.bot);
            if (remainingMembers.size > 0) {
              // Cancel any existing claim/vote session timer
              if (room.claimSession && room.claimSession.timerObj) {
                clearTimeout(room.claimSession.timerObj);
              }

            const endTime = Math.floor((Date.now() + 30000) / 1000);

            // Build select menu options for candidates currently in the channel
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

            const voteEmbed = new EmbedBuilder()
              .setTitle('👑 Ownership Election | انتخابات ملكية الروم')
              .setColor(0xF59E0B)
              .setDescription(
                `The owner has left. A **30-second election** has started to choose the new owner of this room!\n` +
                `لقد غادر مالك الروم. بدأت انتخابات لمدة **30 ثانية** لاختيار المالك الجديد!\n\n` +
                `⏱️ **Time Remaining | الوقت المتبقي:** <t:${endTime}:R>\n\n` +
                `🗳️ **Voters:** Click the dropdown below to cast your vote.\n` +
                `🗳️ **المصوتون:** اضغط على القائمة أدناه لتحديد المالك الجديد.`
              )
              .addFields({ name: '📊 Standings | النتائج', value: '`No votes cast yet | لا توجد أصوات بعد`' })
              .setTimestamp()
              .setFooter({ text: 'Temp Voice • Dev by Akaza_senior' });

            const voteMsg = await voiceChannel.send({
              embeds: [voteEmbed],
              components: [row, ...dashboardGenerator.generateElectionButton(voiceId)]
            }).catch(() => null);

            const timerObj = setTimeout(async () => {
              // 30 seconds finished: evaluate votes
              const currentChannel = await oldState.guild.channels.fetch(voiceId).catch(() => null);
              if (!currentChannel) return;

              const activeRoom = tempVoiceManager.getRoomByVoiceId(voiceId);
              if (!activeRoom || !activeRoom.claimSession) return;

              const finalVotes = activeRoom.claimSession.votes;
              const currentMembers = currentChannel.members.filter(m => !m.user.bot);

              if (currentMembers.size === 0) return; // Empty room, delete routine handles it

              // Initialize votes count for all members currently in channel
              const voteCounts = {};
              currentMembers.forEach(m => {
                voteCounts[m.id] = 0;
              });

              // Process votes (voter and candidate must still be present in the channel)
              finalVotes.forEach((votedId, voterId) => {
                if (currentMembers.has(voterId) && currentMembers.has(votedId)) {
                  voteCounts[votedId] = (voteCounts[votedId] || 0) + 1;
                }
              });

              // Find candidate with max votes
              let winnerId = null;
              let maxVotes = -1;

              Object.entries(voteCounts).forEach(([memberId, count]) => {
                if (count > maxVotes) {
                  maxVotes = count;
                  winnerId = memberId;
                }
              });

              // Fallback if no votes cast: pick the first remaining member
              if (!winnerId || maxVotes === 0) {
                const firstMember = currentMembers.first();
                if (firstMember) {
                  winnerId = firstMember.id;
                  maxVotes = 0;
                }
              }

              if (winnerId) {
                const winnerMember = currentMembers.get(winnerId);
                if (winnerMember) {
                  tempVoiceManager.setOwner(voiceId, winnerId);

                  const endEmbed = new EmbedBuilder()
                    .setTitle('🏆 Election Concluded | انتهت الانتخابات')
                    .setColor(0x10B981)
                    .setDescription(
                      `👑 **<@${winnerId}>** has been elected as the new room owner!\n` +
                      `👑 تم انتخاب **<@${winnerId}>** كمالك جديد للروم!`
                    )
                    .addFields({ name: '📊 Final Votes | الأصوات النهائية', value: `\`${maxVotes}\` vote(s) | صوت` })
                    .setTimestamp()
                    .setFooter({ text: 'Temp Voice • Dev by Akaza_senior' });

                  if (voteMsg) {
                    await voteMsg.edit({ embeds: [endEmbed], components: [] }).catch(() => null);
                  }

                  // Update dynamic control dashboard
                  if (activeRoom.voiceDashboardMessageId) {
                    const voiceDashboardMsg = await currentChannel.messages.fetch(activeRoom.voiceDashboardMessageId).catch(() => null);
                    if (voiceDashboardMsg) {
                      const updatedEmbed = dashboardGenerator.generateEmbed(winnerMember, currentChannel, activeRoom);
                      await voiceDashboardMsg.edit({
                        embeds: [updatedEmbed],
                        components: dashboardGenerator.generateButtons()
                      }).catch(() => null);
                    }
                  }

                  await logger.info(client, '👑 Owner Elected', [
                    { name: 'Voice Channel', value: `${currentChannel.name}` },
                    { name: 'New Owner', value: `${winnerMember.user.tag} (<@${winnerId}>)` },
                    { name: 'Votes Received', value: `${maxVotes}` }
                  ]);
                }
              }

              delete activeRoom.claimSession;
            }, 30000);

            room.claimSession = {
              endTime,
              votes: new Map(), // voterId -> votedId
              timerObj,
              messageId: voteMsg ? voteMsg.id : null
            };
          }
        }
      }
    }
  }

    // Check if the user JOINED a voice channel
    if (newState.channelId) {
      const voiceId = newState.channelId;
      const room = tempVoiceManager.getRoomByVoiceId(voiceId);
      const voiceChannel = newState.channel || await newState.guild.channels.fetch(voiceId).catch(() => null);

      if (voiceChannel) {
        // Synchronize server nickname with the channel's emoji prefix (ALL channels)
        const emoji = emojiHelper.getChannelEmoji(voiceChannel.name);
        if (emoji) {
          await emojiHelper.applyUserNicknameEmoji(member, emoji);
        }
      }

      if (room && voiceChannel) {
        // ── Dispute Feature ──
        const disputeManager = require('../../managers/disputeManager');
        const channelMembers = voiceChannel.members.filter(m => m.id !== member.id && !m.user.bot);
        const hasDispute = channelMembers.some(m => disputeManager.isInDispute(member.id, m.id));

        if (hasDispute) {
          try {
            await member.voice.disconnect('Dispute detected in voice channel');
            const disputeEmbed = embedGenerator.error(
              'You cannot join this room because you are in a dispute with someone already inside.\n' +
              'لا يمكنك الانضمام لهذه الغرفة لوجود شخص بينك وبينه نزاع (Dispute).',
              '⚖️ Dispute Detected'
            );
            await member.send({ embeds: [disputeEmbed] }).catch(() => null);
            await logger.warning(client, 'Dispute Join Prevented', [
              { name: 'User', value: `${member.user.tag} (<@${member.id}>)` },
              { name: 'Voice Channel', value: `${voiceChannel.name}` }
            ]);
          } catch (e) {
            console.error('[VOICE UPDATE] Error handling dispute join:', e);
          }
          return;
        }

        // Cancel any pending deletion timeout
        if (tempVoiceManager.cancelDeletion(voiceId)) {
          console.log(`[TEMP VOICE] Deletion cancelled — ${member.user.tag} rejoined ${voiceChannel.name}.`);
        }

        // Cancel any active election if the owner rejoins
        if (room.claimSession && member.id === room.ownerId) {
          if (room.claimSession.timerObj) {
            clearTimeout(room.claimSession.timerObj);
          }
          if (room.claimSession.messageId) {
            const voteMsg = await voiceChannel.messages.fetch(room.claimSession.messageId).catch(() => null);
            if (voteMsg) {
              await voteMsg.delete().catch(() => null);
            }
          }
          delete room.claimSession;
          console.log(`[TEMP VOICE] Election cancelled — owner ${member.user.tag} rejoined.`);
        }

        // Enforce Global Blocks
        if (restrictionManager.isMemberBlocked(member)) {
          try {
            await member.voice.disconnect('Globally blocked');
            const alertEmbed = embedGenerator.error(
              `⛔ Globally blocked user **${member.user.tag}** attempted to join and was disconnected.`,
              'Global Block Enforced'
            );
            await voiceChannel.send({ embeds: [alertEmbed] }).catch(() => null);
            await logger.warning(client, 'Block Bypass Attempted', [
              { name: 'User', value: `${member.user.tag} (<@${member.id}>)` },
              { name: 'Voice Channel', value: `${voiceChannel.name}` }
            ]);
          } catch (e) {
            console.error('[VOICE UPDATE] Error handling blocked user room join:', e);
          }
          return;
        }

        // ── Enforce restricted-role block on join (failsafe) ─────────────────
        // Disconnects Unverified / Waiting For Interview users even if perms
        // were somehow bypassed (e.g. channel created before this change).
        const BLOCKED_ROLE_IDS_JOIN = ['1508980786949390460', '1509002153426030675'];
        const hasBlockedRole = BLOCKED_ROLE_IDS_JOIN.some(id => member.roles.cache.has(id));
        if (hasBlockedRole) {
          try {
            await member.voice.disconnect('Restricted role — not permitted in temp voice channels');
            await member.send({
              content: '⛔ ليس لديك صلاحية الدخول لغرف الصوت المؤقتة. يرجى إتمام التحقق أولاً.'
            }).catch(() => null);
          } catch (e) {
            console.error('[VOICE UPDATE] Failed to disconnect restricted-role user:', e);
          }
          return;
        }


        // Re-update the voice dashboard to reflect updated member count
        if (room.voiceDashboardMessageId) {
          const voiceDashboardMsg = await voiceChannel.messages.fetch(room.voiceDashboardMessageId).catch(() => null);
          if (voiceDashboardMsg) {
            const owner = await newState.guild.members.fetch(room.ownerId).catch(() => null);
            if (owner) {
              const updatedEmbed = dashboardGenerator.generateEmbed(owner, voiceChannel, room);
              await voiceDashboardMsg.edit({ embeds: [updatedEmbed] }).catch(() => null);
            }
          }
        }
      }
    }
  }
};
