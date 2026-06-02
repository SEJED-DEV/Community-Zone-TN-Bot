const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getSafeEmoji } = require('../../utils/emojiHelper');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('🏓 Check bot latency and system status.'),

  async execute(client, interaction) {
    const sent = await interaction.reply({
      content: `${getSafeEmoji('loading', client, false)} Pinging...`,
      fetchReply: true
    });

    const generateEmbed = () => {
      const wsLatency = client.ws.ping;
      const restLatency = sent.createdTimestamp - interaction.createdTimestamp;
      const uptime = process.uptime();

      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);
      const uptimeStr = `${hours}h ${minutes}m ${seconds}s`;

      return new EmbedBuilder()
        .setTitle(`${getSafeEmoji('online', client, false)} Advanced System Status`)
        .setColor(config.colors.accent)
        .addFields(
          { name: '📡 WebSocket Latency', value: `\`${wsLatency}ms\``, inline: true },
          { name: '🌍 REST Latency', value: `\`${restLatency}ms\``, inline: true },
          { name: '⏱️ Bot Uptime', value: `\`${uptimeStr}\``, inline: true }
        )
        .setFooter({ text: 'Community Zone • Dev by sejed.dev & akaza_senior' })
        .setTimestamp();
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('refresh_ping')
        .setLabel('Refresh Stats')
        .setEmoji(getSafeEmoji('loading', client, true))
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.editReply({
      content: null,
      embeds: [generateEmbed()],
      components: [row]
    });

    // Simple collector for refresh button
    const collector = sent.createMessageComponentCollector({
      filter: i => i.customId === 'refresh_ping' && i.user.id === interaction.user.id,
      time: 60000
    });

    collector.on('collect', async i => {
      await i.update({
        embeds: [generateEmbed()],
        components: [row]
      });
    });

    collector.on('end', () => {
      interaction.editReply({ components: [] }).catch(() => null);
    });
  },
};
