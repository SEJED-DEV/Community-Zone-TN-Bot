const http = require('http');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const tempVoiceManager = require('./tempVoice');
const levelingManager = require('./levelingManager');
const economyManager = require('./economyManager');

class ApiManager {
  constructor() {
    this.server = null;
    this.port = process.env.API_PORT || 3000;
  }

  init(client) {
    this.server = http.createServer((req, res) => {
      // Enable CORS for all requests
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = req.url;

      // ─── 1. API stats endpoint ─────────────────────────────────────────────
      if (url === '/api/stats') {
        try {
          const guildId = config.guildId;
          const guild = client.guilds.cache.get(guildId) || client.guilds.cache.first();

          if (!guild) {
            // Return bot client stats as safe fallback rather than returning a 500 error
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              serverName: "Community Zone TN",
              totalMembers: client.users.cache.size || 0,
              voiceMembers: 0,
              tempRooms: 0,
              totalDT: 0,
              totalXP: 0,
              activeBoost: "×2.0 XP",
              botStatus: "Online",
              uptime: Math.floor(process.uptime())
            }));
            return;
          }

          // Count active voice users
          const voiceMembersCount = guild.voiceStates.cache.filter(vs => vs.channelId).size;

          // Count temp rooms
          const activeTempRooms = tempVoiceManager.rooms.size;

          // Count total DT and XP pools
          let totalDT = 0;
          let totalXP = 0;
          
          if (economyManager._data && economyManager._data[guild.id]) {
            Object.values(economyManager._data[guild.id]).forEach(user => {
              totalDT += user.balance || 0;
            });
          }

          if (levelingManager._cache && levelingManager._cache[guild.id]) {
            Object.values(levelingManager._cache[guild.id]).forEach(user => {
              totalXP += user.xp || 0;
            });
          }

          const stats = {
            serverName: guild.name,
            totalMembers: guild.memberCount,
            voiceMembers: voiceMembersCount, // always absolute real voice count
            tempRooms: activeTempRooms,       // always absolute real temp room count
            totalDT: totalDT,                 // always absolute real economy circulation pool
            totalXP: totalXP,                 // always absolute real leveling pool
            activeBoost: "×2.0 XP",
            botStatus: "Online",
            uptime: Math.floor(process.uptime())
          };

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(stats));
        } catch (err) {
          console.error('[API SERVER ERROR]', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error processing statistics.' }));
        }
        return;
      }

      // ─── 2. Static File Server ─────────────────────────────────────────────
      // Normalize request path
      let filePath = url === '/' || url === '' ? '/index.html' : url;
      
      // Prevent directory traversal attacks
      filePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
      
      const absolutePath = path.join(__dirname, '../../web', filePath);

      // Check if file exists and serve it
      fs.stat(absolutePath, (err, stats) => {
        if (err || !stats.isFile()) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
          return;
        }

        // Determine Content-Type
        const ext = path.extname(absolutePath).toLowerCase();
        let contentType = 'text/html';
        
        switch (ext) {
          case '.css':
            contentType = 'text/css';
            break;
          case '.js':
            contentType = 'application/javascript';
            break;
          case '.png':
            contentType = 'image/png';
            break;
          case '.jpg':
          case '.jpeg':
            contentType = 'image/jpeg';
            break;
          case '.gif':
            contentType = 'image/gif';
            break;
          case '.json':
            contentType = 'application/json';
            break;
        }

        res.writeHead(200, { 'Content-Type': contentType });
        
        // Use read stream for memory efficiency
        const stream = fs.createReadStream(absolutePath);
        stream.on('error', (streamErr) => {
          console.error('[API SERVER FILE STREAM ERROR]', streamErr);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('500 Internal Server Error');
          }
        });
        stream.pipe(res);
      });
    });

    this.server.listen(this.port, () => {
      console.log(`[WEB SERVER] Landing page & Stats API online at http://localhost:${this.port}/`);
    });
  }
}

module.exports = new ApiManager();
