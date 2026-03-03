const fs = require('fs').promises;
const path = require('path');

class SessionManager {
  constructor(db) {
    this.db = db;
    this.sessionsDir = './auth_info_baileys';
  }

  async init() {
    await fs.mkdir(this.sessionsDir, { recursive: true });
  }

  async saveSession(jid, creds) {
    try {
      // Save to MongoDB
      if (this.db) {
        await this.db.saveSession(jid, creds);
      }

      // Save to local file as backup
      const sessionFile = path.join(this.sessionsDir, `${jid}.json`);
      await fs.writeFile(sessionFile, JSON.stringify(creds, null, 2));

      console.log(`💾 Session saved for ${jid}`);
      return true;
    } catch (error) {
      console.error('Session save error:', error);
      return false;
    }
  }

  async loadSession(jid) {
    try {
      // Try MongoDB first
      if (this.db) {
        const session = await this.db.getSession(jid);
        if (session) {
          console.log(`📥 Loaded session from MongoDB for ${jid}`);
          return session;
        }
      }

      // Fallback to local file
      const sessionFile = path.join(this.sessionsDir, `${jid}.json`);
      if (await this.fileExists(sessionFile)) {
        const data = await fs.readFile(sessionFile, 'utf-8');
        console.log(`📥 Loaded session from file for ${jid}`);
        return JSON.parse(data);
      }

      return null;
    } catch (error) {
      console.error('Session load error:', error);
      return null;
    }
  }

  async deleteSession(jid) {
    try {
      // Delete from MongoDB
      if (this.db) {
        await this.db.db.collection('sessions').deleteOne({ jid });
      }

      // Delete local file
      const sessionFile = path.join(this.sessionsDir, `${jid}.json`);
      if (await this.fileExists(sessionFile)) {
        await fs.unlink(sessionFile);
      }

      console.log(`🗑️ Session deleted for ${jid}`);
      return true;
    } catch (error) {
      console.error('Session delete error:', error);
      return false;
    }
  }

  async listSessions() {
    try {
      if (this.db) {
        const sessions = await this.db.db.collection('sessions').find({}).toArray();
        return sessions.map(s => ({ jid: s.jid, updatedAt: s.updatedAt }));
      }

      const files = await fs.readdir(this.sessionsDir);
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => ({
          jid: f.replace('.json', ''),
          file: f
        }));
    } catch (error) {
      console.error('List sessions error:', error);
      return [];
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async backupAllSessions() {
    try {
      const sessions = await this.listSessions();
      const backupDir = path.join(__dirname, '../../backups/sessions');
      await fs.mkdir(backupDir, { recursive: true });

      const timestamp = Date.now();
      const backupFile = path.join(backupDir, `backup_${timestamp}.json`);

      const backupData = [];
      for (const session of sessions) {
        const creds = await this.loadSession(session.jid);
        if (creds) {
          backupData.push({ jid: session.jid, creds });
        }
      }

      await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));
      console.log(`💾 All sessions backed up to ${backupFile}`);
      return backupFile;
    } catch (error) {
      console.error('Backup error:', error);
      return null;
    }
  }
}

module.exports = SessionManager;

