const fs = require('fs');
const path = require('path');

/**
 * Dynamically loads all event files from the events directory.
 * @param {Client} client - The Discord Bot Client instance
 */
module.exports = (client) => {
  const eventsPath = path.join(__dirname, '../events');
  if (!fs.existsSync(eventsPath)) {
    console.error(`[EVENT HANDLER ERROR] Events directory not found at: ${eventsPath}`);
    return;
  }

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

  const eventFiles = getFiles(eventsPath);
  let loadedCount = 0;

  for (const file of eventFiles) {
    try {
      const event = require(file);
      if (!event.name) {
        console.warn(`[EVENT HANDLER WARNING] Event at ${path.basename(file)} is missing a name property. Skipping.`);
        continue;
      }

      if (event.once) {
        client.once(event.name, (...args) => event.execute(client, ...args));
      } else {
        client.on(event.name, (...args) => event.execute(client, ...args));
      }
      loadedCount++;
    } catch (error) {
      console.error(`[EVENT HANDLER ERROR] Failed to load event file ${path.basename(file)}:`, error);
    }
  }

  console.log(`[EVENT HANDLER SUCCESS] Successfully loaded ${loadedCount} events.`);
};
