const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../../data');
const disputePath = path.join(dataDir, 'disputes.json');

class DisputeManager {
  constructor() {
    this.disputes = new Map(); // userId -> Set of userIds they are in dispute with
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.loadDisputes();
  }

  loadDisputes() {
    if (fs.existsSync(disputePath)) {
      try {
        const raw = fs.readFileSync(disputePath, 'utf8');
        const data = JSON.parse(raw);
        for (const [userId, targetIds] of Object.entries(data)) {
          this.disputes.set(userId, new Set(targetIds));
        }
      } catch (e) {
        console.error('[DISPUTE MANAGER ERROR] Failed to load disputes.json:', e);
      }
    }
  }

  saveDisputes() {
    try {
      const data = {};
      for (const [userId, targetIds] of this.disputes.entries()) {
        data[userId] = Array.from(targetIds);
      }
      fs.writeFileSync(disputePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.error('[DISPUTE MANAGER ERROR] Failed to save disputes.json:', e);
    }
  }

  addDispute(user1Id, user2Id) {
    if (!this.disputes.has(user1Id)) this.disputes.set(user1Id, new Set());
    if (!this.disputes.has(user2Id)) this.disputes.set(user2Id, new Set());

    this.disputes.get(user1Id).add(user2Id);
    this.disputes.get(user2Id).add(user1Id);
    this.saveDisputes();
  }

  removeDispute(user1Id, user2Id) {
    if (this.disputes.has(user1Id)) {
      this.disputes.get(user1Id).delete(user2Id);
      if (this.disputes.get(user1Id).size === 0) this.disputes.delete(user1Id);
    }
    if (this.disputes.has(user2Id)) {
      this.disputes.get(user2Id).delete(user1Id);
      if (this.disputes.get(user2Id).size === 0) this.disputes.delete(user2Id);
    }
    this.saveDisputes();
  }

  isInDispute(user1Id, user2Id) {
    return this.disputes.has(user1Id) && this.disputes.get(user1Id).has(user2Id);
  }

  getDisputes(userId) {
    return this.disputes.get(userId) || new Set();
  }
}

module.exports = new DisputeManager();
