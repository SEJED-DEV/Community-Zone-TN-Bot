const { EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  name: 'guildMemberRemove',
  once: false,
  async execute(client, member) {
    // Check if a leave channel is configured
    const leaveChannelId = config.leaveChannelId;
    if (!leaveChannelId) return;

    const leaveChannel = await member.guild.channels.fetch(leaveChannelId).catch(() => null);
    if (!leaveChannel) return;

    // Calculate how long the member was in the server
    const joinedAt = member.joinedAt;
    let memberDuration = 'Unknown';
    if (joinedAt) {
      const diffMs = Date.now() - joinedAt.getTime();
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      if (days > 0) memberDuration = `${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}`;
      else memberDuration = `${hours} hour${hours !== 1 ? 's' : ''}`;
    }

    // Get the member's top role (excluding @everyone)
    const topRole = member.roles.cache
      .filter(r => r.id !== member.guild.id)
      .sort((a, b) => b.position - a.position)
      .first();

    const embed = new EmbedBuilder()
      .setTitle('👋 Member Left the Server')
      .setColor(config.colors.logging.memberLeave)
      .setDescription(
        `**${member.user.tag}** has left **${member.guild.name}**.\n` +
        `> *We hope to see you again soon!*`
      )
      .addFields([
        {
          name: '👤 Member',
          value: `<@${member.id}> (\`${member.user.tag}\`)`,
          inline: true
        },
        {
          name: '🆔 User ID',
          value: `\`${member.id}\``,
          inline: true
        },
        {
          name: '📅 Joined At',
          value: joinedAt ? `<t:${Math.floor(joinedAt.getTime() / 1000)}:D>` : 'Unknown',
          inline: true
        },
        {
          name: '⏱️ Time in Server',
          value: memberDuration,
          inline: true
        },
        {
          name: '🏅 Highest Role',
          value: topRole ? `<@&${topRole.id}>` : '@everyone',
          inline: true
        },
        {
          name: '👥 Member Count',
          value: `\`${member.guild.memberCount}\` members remaining`,
          inline: true
        }
      ])
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp()
      .setFooter({ text: `${member.guild.name} • Member Departed` });

    await leaveChannel.send({ embeds: [embed] }).catch(err => {
      console.error('[LEAVE EVENT] Failed to send leave message:', err);
    });
  }
};
