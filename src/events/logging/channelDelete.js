const { ChannelType } = require('discord.js');
const config = require('../../config');
const logger = require('../../utils/logger');

// Helper to convert ChannelType to human-readable string
function getChannelTypeName(type) {
  switch (type) {
    case ChannelType.GuildText: return '📝 Text Channel';
    case ChannelType.GuildVoice: return '🔊 Voice Channel';
    case ChannelType.GuildCategory: return '📁 Category';
    case ChannelType.GuildAnnouncement: return '📢 Announcement Channel';
    case ChannelType.GuildStageVoice: return '🎭 Stage Channel';
    case ChannelType.GuildForum: return '💬 Forum Channel';
    default: return '❓ Unknown';
  }
}

module.exports = {
  name: 'channelDelete',
  once: false,
  async execute(client, channel) {
    if (!channel.guild) return; // Only log guild channels

    const fields = [
      { name: '📁 Channel Name', value: `${channel.name}`, inline: true },
      { name: '🆔 Channel ID', value: `\`${channel.id}\``, inline: true },
      { name: '🛠️ Channel Type', value: getChannelTypeName(channel.type), inline: true }
    ];

    if (channel.parent) {
      fields.push({ name: '📁 Category Parent', value: `${channel.parent.name} (\`${channel.parentId}\`)`, inline: false });
    }

    await logger.log(
      client,
      '🗑️ Channel Deleted',
      fields,
      config.colors.logging.channel
    );
  }
};
