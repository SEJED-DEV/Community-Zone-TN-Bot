const fs   = require('fs');
const path = require('path');

const DATA_DIR  = path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'confessions.json');

// ─── default shape ───────────────────────────────────────────────────────────
function defaultStore() {
  return {
    nextId: 1,          // auto-incrementing confession number
    messages: {},       // messageId → { id, reactions: { love, sad, haha, angry, wow }, voters: { userId → emoji } }
  };
}

// ─── I/O helpers ─────────────────────────────────────────────────────────────
function load() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) return defaultStore();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return defaultStore();
  }
}

function save(store) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

// ─── Public API ───────────────────────────────────────────────────────────────
class ConfessManager {
  /** Reserve the next confession ID and return it. */
  nextConfessionId() {
    const store = load();
    const id = store.nextId;
    store.nextId = id + 1;
    save(store);
    return id;
  }

  /** Register a published message so we can track reactions. */
  registerMessage(messageId, confessionId) {
    const store = load();
    store.messages[messageId] = {
      id: confessionId,
      reactions: { love: 0, sad: 0, haha: 0, angry: 0, wow: 0 },
      voters: {},
    };
    save(store);
  }

  /**
   * Toggle or switch a user's reaction on a given message.
   * Returns { added, removed, counts } where added/removed are emoji keys or null.
   */
  toggleReaction(messageId, userId, emoji) {
    const store = load();
    const msg = store.messages[messageId];
    if (!msg) return null;

    const prev = msg.voters[userId] || null;

    // Remove previous vote
    if (prev && msg.reactions[prev] !== undefined) {
      msg.reactions[prev] = Math.max(0, msg.reactions[prev] - 1);
    }

    if (prev === emoji) {
      // User clicked same emoji → toggle off
      delete msg.voters[userId];
      save(store);
      return { added: null, removed: prev, counts: { ...msg.reactions } };
    }

    // Add new vote
    msg.reactions[emoji] = (msg.reactions[emoji] || 0) + 1;
    msg.voters[userId] = emoji;
    save(store);
    return { added: emoji, removed: prev, counts: { ...msg.reactions } };
  }

  /** Get metadata for a tracked message. */
  getMessage(messageId) {
    return load().messages[messageId] || null;
  }

  /** Return top-3 confessions per reaction type. */
  getTopConfessions() {
    const store = load();
    const entries = Object.entries(store.messages);

    const top = (emoji) =>
      entries
        .filter(([, m]) => m.reactions[emoji] > 0)
        .sort(([, a], [, b]) => b.reactions[emoji] - a.reactions[emoji])
        .slice(0, 3)
        .map(([msgId, m]) => ({ msgId, id: m.id, count: m.reactions[emoji] }));

    return {
      love:  top('love'),
      sad:   top('sad'),
      haha:  top('haha'),
      angry: top('angry'),
      wow:   top('wow'),
    };
  }
}

module.exports = new ConfessManager();
