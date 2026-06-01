/**
 * youtubeCookieLoader.js
 *
 * Pre-generates the .data/youtube.data file that play-dl reads natively
 * at module initialization. Must be called BEFORE play-dl is required
 * anywhere in the codebase.
 *
 * Source: play-dl checks (0,V.existsSync)(".data/youtube.data") on startup
 * and loads cookies from it automatically into its internal cookie store.
 */

const fs = require('fs');
const path = require('path');

function loadYoutubeCookies() {
  // cookies.txt is always in the process working directory (bot root)
  const cookiesPath = path.join(process.cwd(), 'cookies.txt');

  if (!fs.existsSync(cookiesPath)) {
    console.log('[YOUTUBE COOKIES] No cookies.txt found in root directory. YouTube may be rate-limited on this server IP.');
    return false;
  }

  try {
    const content = fs.readFileSync(cookiesPath, 'utf8');
    const lines = content.split('\n');
    const cookieObj = {};

    for (const line of lines) {
      if (!line.trim() || line.startsWith('#')) continue;
      const parts = line.trim().split('\t');
      if (parts.length < 7) continue;

      const domain = parts[0];
      if (!domain.includes('youtube.com') && !domain.includes('google.com')) continue;

      // Netscape cookie format: domain, flag, path, secure, expiry, name, value
      const name  = parts[5].replace(/[\r\n\x00-\x1F\x7F]/g, '').trim();
      const value = parts[6].replace(/[\r\n\x00-\x1F\x7F]/g, '').trim();

      if (!name) continue;

      cookieObj[name] = value;
    }

    const count = Object.keys(cookieObj).length;

    if (count === 0) {
      console.warn('[YOUTUBE COOKIES] cookies.txt found but no valid youtube.com cookies parsed.');
      return false;
    }

    // Expose the raw cookie string globally so the fallback fetcher can use it to authenticate
    const cookieString = Object.entries(cookieObj).map(([k, v]) => `${k}=${v}`).join('; ');
    process.env.YT_COOKIE = cookieString;

    // Write to .data/youtube.data — play-dl reads this automatically at require() time
    const dataDir = path.join(process.cwd(), '.data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dataPath = path.join(dataDir, 'youtube.data');
    fs.writeFileSync(dataPath, JSON.stringify({ cookie: cookieObj }, null, 2), 'utf8');

    console.log(`[YOUTUBE COOKIES] Wrote ${count} youtube.com cookies to .data/youtube.data — play-dl will auto-load on next require().`);
    return true;

  } catch (err) {
    console.error('[YOUTUBE COOKIES] Failed to process cookies.txt:', err.message);
    return false;
  }
}

module.exports = loadYoutubeCookies;
