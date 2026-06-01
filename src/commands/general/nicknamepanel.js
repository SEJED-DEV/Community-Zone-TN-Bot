const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nicknamepanel')
    .setDescription('Deploy the Server Nickname Change Panel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('The channel to send the Nickname Panel to.')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  async execute(client, interaction) {
    const channel = interaction.options.getChannel('channel');
    const { emojis } = require('../../config');

    const embed = new EmbedBuilder()
      .setColor(0x8B5CF6)
      .setTitle('🪪 Identity Management | تغيير الاسم المستعار')
      .setDescription(
        'Click the button below to change your nickname in this server.\n' +
        'اضغط على الزر أدناه لتغيير اسمك المستعار في هذا السيرفر.\n\n' +
        '**⚠️ Rules:**\n' +
        '• Do not use offensive names.\n' +
        '• Admin tag will be applied automatically.'
      )
      .setFooter({ text: 'Community Zone • Identity System' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('nickname_panel_btn')
        .setLabel('Change Nickname')
        .setEmoji(emojis.rename || '📝')
        .setStyle(ButtonStyle.Primary)
    );

    await channel.send({ embeds: [embed], components: [row] });
    return interaction.reply({ content: `✅ Nickname panel deployed in ${channel}.`, ephemeral: true });
  },
};
