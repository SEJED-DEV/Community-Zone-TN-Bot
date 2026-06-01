const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { applyPrefix, PREFIX } = require('../../utils/prefixManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('applyprefixall')
    .setDescription(`Apply the ${PREFIX}prefix to ALL members in the server. (Admin only)`)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(client, interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;

    // Fetch all members
    await guild.members.fetch();
    const members = guild.members.cache.filter(m => !m.user.bot && m.id !== guild.ownerId);

    let success = 0;
    let skipped = 0;
    let failed = 0;

    const total = members.size;

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xF59E0B)
          .setTitle('⏳ Applying CZT Prefix...')
          .setDescription(`Processing **${total}** members. This may take a moment...`)
          .setFooter({ text: 'Community Zone • Admin Tools' })
      ]
    });

    for (const [, member] of members) {
      try {
        await applyPrefix(member);
        // Small delay to avoid rate limits (Discord allows ~5 nickname changes/sec per guild)
        await new Promise(r => setTimeout(r, 300));
        success++;
      } catch (err) {
        // Count permission errors as skipped (e.g. higher-role admins)
        if (err.message?.includes('Missing Permissions')) {
          skipped++;
        } else {
          failed++;
          console.warn(`[PREFIX CMD] Failed for ${member.user.tag}: ${err.message}`);
        }
      }
    }

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x10B981)
          .setTitle('✅ CZT Prefix Applied!')
          .setDescription(`The \`${PREFIX}\` prefix has been applied to all members.`)
          .addFields(
            { name: '✅ Success', value: `\`${success}\` members updated`, inline: true },
            { name: '⚠️ Skipped', value: `\`${skipped}\` (higher role / no permission)`, inline: true },
            { name: '❌ Failed', value: `\`${failed}\` errors`, inline: true }
          )
          .setFooter({ text: 'Community Zone • Admin Tools' })
          .setTimestamp()
      ]
    });
  }
};
