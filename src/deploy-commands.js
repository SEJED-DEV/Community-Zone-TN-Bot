const { REST, Routes, Collection } = require('discord.js');
const config = require('./config');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

// Helper to read directories recursively
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

for (const file of commandFiles) {
  const command = require(file);
  if (command.data && command.execute) {
    commands.push(command.data.toJSON());
  }
}

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    if (config.guildId) {
      // Guild commands - instant update
      const data = await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commands },
      );
      console.log(`Successfully reloaded ${data.length} application (/) commands for guild ${config.guildId}.`);
    } else {
      // Global commands - up to 1 hour to update
      const data = await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commands },
      );
      console.log(`Successfully reloaded ${data.length} application (/) commands GLOBALLY.`);
    }
  } catch (error) {
    console.error(error);
  }
})();
