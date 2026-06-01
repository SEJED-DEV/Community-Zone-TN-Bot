const fs = require('fs');
const path = require('path');
const { Collection, REST, Routes } = require('discord.js');
const config = require('../config');

/**
 * Dynamically loads and registers all slash command files.
 * Provides a method to deploy loaded commands to Discord REST API.
 */
module.exports = {
  loadCommands: (client) => {
    client.commands = new Collection();
    const commandsPath = path.join(__dirname, '../commands');
    
    if (!fs.existsSync(commandsPath)) {
      console.warn(`[COMMAND HANDLER WARNING] Commands directory not found at: ${commandsPath}`);
      return;
    }

    const getFiles = (dir) => {
      let files = [];
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        if (item.isDirectory()) {
          files = [...files, ...getFiles(path.join(dir, item.name))];
        } else if (item.isFile() && item.name.endsWith('.js')) {
          files.push(path.join(dir, item.name));
        }
      }
      return files;
    };

    const commandFiles = getFiles(commandsPath);
    let loadedCount = 0;

    for (const file of commandFiles) {
      try {
        const command = require(file);
        if (!command.data || !command.execute) {
          console.warn(`[COMMAND HANDLER WARNING] Command at ${path.basename(file)} is missing required "data" or "execute" property. Skipping.`);
          continue;
        }

        client.commands.set(command.data.name, command);
        loadedCount++;
      } catch (error) {
        console.error(`[COMMAND HANDLER ERROR] Failed to load command file ${path.basename(file)}:`, error);
      }
    }

    console.log(`[COMMAND HANDLER SUCCESS] Successfully loaded ${loadedCount} slash commands.`);
  },

  registerSlashCommands: async (client) => {
    const token = config.token;
    const clientId = config.clientId;
    const guildId = config.guildId;

    if (!token || token === 'YOUR_BOT_TOKEN_HERE') {
      console.error('[DEPLOY COMMANDS ERROR] DISCORD_TOKEN is missing or not configured in .env.');
      return;
    }

    if (!clientId || clientId === 'YOUR_BOT_CLIENT_ID_HERE') {
      console.error('[DEPLOY COMMANDS ERROR] CLIENT_ID is missing or not configured in .env.');
      return;
    }

    const commandsData = Array.from(client.commands.values()).map(cmd => cmd.data.toJSON());
    const rest = new REST({ version: '10' }).setToken(token);

    try {
      console.log('[DEPLOY COMMANDS] Started refreshing application (/) commands...');

      if (guildId && guildId !== 'YOUR_SERVER_GUILD_ID_HERE') {
        // Step 1: Wipe all GLOBAL commands first to prevent duplicates
        console.log('[DEPLOY COMMANDS] Clearing global commands to prevent duplicates...');
        await rest.put(
          Routes.applicationCommands(clientId),
          { body: [] }
        );
        console.log('[DEPLOY COMMANDS] ✅ Global commands cleared.');

        // Step 2: Register commands to specific guild (instant)
        console.log(`[DEPLOY COMMANDS] Registering commands to Guild: ${guildId}`);
        await rest.put(
          Routes.applicationGuildCommands(clientId, guildId),
          { body: commandsData }
        );
        console.log('[DEPLOY COMMANDS SUCCESS] Server (/) commands registered successfully.');
      } else {
        // Registering globally (can take up to 1 hour, standard for public bots)
        console.log('[DEPLOY COMMANDS] Registering commands GLOBALLY...');
        await rest.put(
          Routes.applicationCommands(clientId),
          { body: commandsData }
        );
        console.log('[DEPLOY COMMANDS SUCCESS] Global (/) commands registered successfully.');
      }
    } catch (error) {
      console.error('[DEPLOY COMMANDS ERROR] Error encountered during application command deployment:', error);
    }
  }
};
