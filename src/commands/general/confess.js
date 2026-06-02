const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');

// ─── Spam-guard: userId → last submission timestamp ──────────────────────────
const cooldowns = new Map();
const COOLDOWN_MS = 60_000; // 1 minute between submissions

// ─── Link / promo filter ─────────────────────────────────────────────────────
const BLOCKED_PATTERNS = [
  /https?:\/\//i,           // URLs
  /discord\.gg\//i,         // Discord invites
  /bit\.ly|t\.me|tinyurl/i, // link shorteners
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('confess')
    .setDescription('💌 Send an anonymous message to the community | أرسل رسالة مجهولة للمجتمع'),

  // ─── Expose filters so interaction.js can re-use them ───────────────────────
  BLOCKED_PATTERNS,
  cooldowns,
  COOLDOWN_MS,

  async execute(client, interaction) {
    // Check cooldown first (before showing modal)
    const userId = interaction.user.id;
    const last   = cooldowns.get(userId) || 0;
    const now    = Date.now();

    const { getSafeEmoji } = require('../../utils/emojiHelper');

    if (now - last < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
      return interaction.reply({
        content: `${getSafeEmoji('warning', client, false)} يمكنك إرسال رسالة واحدة كل دقيقة. انتظر **${remaining} ثانية** قبل المحاولة مرة أخرى.\n*(You can send one message per minute — wait **${remaining}s**.)*`,
        ephemeral: true,
      });
    }

    // Show modal
    const modal = new ModalBuilder()
      .setCustomId('confess_modal_submit')
      .setTitle('Anonymous Message | رسالة مجهولة');

    const messageInput = new TextInputBuilder()
      .setCustomId('confess_message_input')
      .setLabel('رسالتك | Your Message')
      .setPlaceholder('اكتب رسالتك هنا... / Write your message here...')
      .setStyle(TextInputStyle.Paragraph)
      .setMinLength(10)
      .setMaxLength(1000)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(messageInput));
    return interaction.showModal(modal);
  },
};
