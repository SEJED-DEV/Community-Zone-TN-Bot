const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');
const settingsManager = require('../../utils/settingsManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setupconfess')
    .setDescription('Configure the Anonymous Message System | إعداد نظام الرسائل المجهولة')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub
        .setName('channel')
        .setDescription('Set the channel where anonymous messages are published')
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('Target text channel')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('status').setDescription('Show current confession system configuration')
    )
    .addSubcommand(sub =>
      sub.setName('disable').setDescription('Disable the anonymous message system')
    ),

  async execute(client, interaction) {
    await interaction.deferReply({ ephemeral: true });
    const sub = interaction.options.getSubcommand();

    // ── status ────────────────────────────────────────────────
    if (sub === 'status') {
      const settings = settingsManager.loadSettings();
      const ch = settings.confessChannelId
        ? `<#${settings.confessChannelId}>`
        : '`Not configured` — run `/setupconfess channel`';

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x8B5CF6)
            .setTitle('💌 Anonymous Messages — Status | حالة نظام الرسائل المجهولة')
            .addFields(
              { name: '📣 Confessions Channel', value: ch, inline: false },
              { name: '🛡️ Protections',        value: '• No links/ads\n• 1-minute cooldown per user\n• Mod logs on every submission', inline: false }
            )
            .setFooter({ text: 'Community Zone • Dev by Akaza_senior' })
            .setTimestamp(),
        ],
      });
    }

    // ── disable ───────────────────────────────────────────────
    if (sub === 'disable') {
      settingsManager.saveSettings({ confessChannelId: null });
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xEF4444)
            .setTitle('🚫 Anonymous Messages Disabled')
            .setDescription('The anonymous message system has been **disabled**. `/confess` will no longer work until you re-configure a channel.')
            .setFooter({ text: 'Community Zone • Dev by Akaza_senior' })
            .setTimestamp(),
        ],
      });
    }

    // ── channel ───────────────────────────────────────────────
    if (sub === 'channel') {
      const channel = interaction.options.getChannel('channel');
      settingsManager.saveSettings({ confessChannelId: channel.id });

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x10B981)
            .setTitle('✅ Confessions Channel Set | تم تعيين قناة الرسائل المجهولة')
            .setDescription(
              `Anonymous messages will now be published in ${channel}.\n` +
              `سيتم نشر الرسائل المجهولة الآن في ${channel}.`
            )
            .addFields({
              name: '💡 Tip',
              value: 'Members can use `/confess` to submit an anonymous message.',
              inline: false,
            })
            .setFooter({ text: 'Community Zone • Dev by Akaza_senior' })
            .setTimestamp(),
        ],
      });
    }
  },
};
