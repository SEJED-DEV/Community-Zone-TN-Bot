/**
 * walletLog.js
 * Posts a wallet update to the dedicated economy log channel
 * whenever a user's balance crosses a new 100 DT milestone.
 *
 * Channel: 1510277151444697229
 */

const { EmbedBuilder } = require('discord.js');

const WALLET_LOG_CHANNEL_ID = '1510277151444697229';

/**
 * Call this after any balance change that returns { balance, crossedMilestone }.
 * Only fires a public message when crossedMilestone is not null
 * (i.e. the user just passed a new 100 DT mark).
 *
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').Guild}  guild
 * @param {string}  userId
 * @param {number}  newBalance      - Current balance after the operation
 * @param {number|null} crossedMilestone - e.g. 100, 200, 500 … or null if no milestone
 * @param {string}  [reason]        - Why the balance changed (shown in embed)
 */
async function fireMilestoneLog(client, guild, userId, newBalance, crossedMilestone, reason = '') {
  if (!crossedMilestone) return; // No milestone crossed → nothing to post

  try {
    const channel = guild.channels.cache.get(WALLET_LOG_CHANNEL_ID)
      || await guild.channels.fetch(WALLET_LOG_CHANNEL_ID).catch(() => null);

    if (!channel || !channel.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor(0xF59E0B)
      .setTitle('💰 محفظة — تحديث الرصيد')
      .setDescription(
        `🎉 <@${userId}> وصل رصيده إلى **${crossedMilestone.toLocaleString()} DT** أو أكثر!\n\n` +
        `💳 **الرصيد الحالي:** \`${newBalance.toLocaleString()} DT\`` +
        (reason ? `\n📝 **السبب:** ${reason}` : '')
      )
      .setTimestamp()
      .setFooter({ text: 'Community Zone • Dinar TN Economy' });

    await channel.send({
      content: `<@${userId}>`,
      embeds: [embed],
      allowedMentions: { users: [userId] },
    }).catch(() => null);
  } catch (err) {
    console.error('[WALLET LOG] Failed to post milestone:', err);
  }
}

module.exports = { fireMilestoneLog, WALLET_LOG_CHANNEL_ID };
