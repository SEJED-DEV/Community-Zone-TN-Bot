const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ChannelType,
} = require('discord.js');
const embedGenerator = require('../../utils/embedGenerator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('📢 Send a message as the bot (Admins only).')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('The channel to send the message to (defaults to current).')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addAttachmentOption(opt =>
      opt.setName('attachment')
        .setDescription('Optional file to upload with the message.')
        .setRequired(false)
    ),

  async execute(client, interaction) {
    // Permission check (redundant but safe)
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        embeds: [embedGenerator.error('⛔ Only **Administrators** can use this command.')],
        ephemeral: true
      });
    }

    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const attachment = interaction.options.getAttachment('attachment');

    // Create Modal
    const modal = new ModalBuilder()
      .setCustomId('say_modal')
      .setTitle('📢 Send Message as Bot');

    const messageInput = new TextInputBuilder()
      .setCustomId('message_input')
      .setLabel('Message Content')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Type your message here...')
      .setRequired(true)
      .setMaxLength(2000);

    modal.addComponents(new ActionRowBuilder().addComponents(messageInput));

    await interaction.showModal(modal);

    // Wait for submission (Max 5 minutes)
    const submitted = await interaction.awaitModalSubmit({
      filter: i => i.customId === 'say_modal' && i.user.id === interaction.user.id,
      time: 300000 // 5 minutes (Largest possible)
    }).catch(() => null);

    if (submitted) {
      const content = submitted.fields.getTextInputValue('message_input');

      try {
        const payload = { content };
        if (attachment) {
          payload.files = [attachment.url];
        }

        await channel.send(payload);

        await submitted.reply({
          content: `✅ Message successfully sent to ${channel}!`,
          ephemeral: true
        });
      } catch (err) {
        console.error('[SAY COMMAND ERROR]', err);
        if (!submitted.replied) {
          await submitted.reply({
            embeds: [embedGenerator.error(`Failed to send message: ${err.message}`)],
            ephemeral: true
          });
        }
      }
    }
  },
};
