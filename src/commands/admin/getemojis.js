const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('getemojis')
    .setDescription('Fetch all emojis from a server formatted for emojis.js.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('guild_id')
         .setDescription('The ID of the server to fetch emojis from (defaults to 1487212215336571043).')
         .setRequired(false)
    ),

  async execute(client, interaction) {
    const guildId = interaction.options.getString('guild_id') || '1487212215336571043';
    const guild = await client.guilds.fetch(guildId).catch(() => null);

    if (!guild) {
      return interaction.reply({
        content: `❌ Could not find or access guild with ID: \`${guildId}\`. Make sure the bot is in that server.`,
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const emojis = await guild.emojis.fetch();
    if (emojis.size === 0) {
      return interaction.editReply({
        content: `⚠️ No custom emojis found in **${guild.name}**.`
      });
    }

    // Format as JSON object string
    const emojiMap = {};
    emojis.forEach(e => {
      emojiMap[e.name] = `<${e.animated ? 'a' : ''}:${e.name}:${e.id}>`;
    });

    const jsonString = JSON.stringify(emojiMap, null, 2);

    // Discord message limit check
    if (jsonString.length > 1900) {
      // Split into multiple parts or send as file
      const buffer = Buffer.from(jsonString, 'utf-8');
      return interaction.editReply({
        content: `✅ Fetched \`${emojis.size}\` emojis from **${guild.name}**. See attached file for JSON:`,
        files: [{ attachment: buffer, name: `emojis_${guild.id}.json` }]
      });
    }

    return interaction.editReply({
      content: `✅ Fetched \`${emojis.size}\` emojis from **${guild.name}**:\n\`\`\`json\n${jsonString}\n\`\`\``
    });
  }
};
