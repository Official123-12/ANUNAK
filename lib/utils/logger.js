const fs = require('fs').promises;
const path = require('path');

class Logger {
  constructor(logsDir = './logs') {
    this.logsDir = logsDir;
    this.init();
  }

  async init() {
    await fs.mkdir(this.logsDir, { recursive: true });
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  async write(level, message, data = {}) {
    const logEntry = {
      timestamp: this.getTimestamp(),
      level,
      message,
      ...data
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logsDir, `${date}.log`);

    try {
      await fs.appendFile(logFile, logLine);
    } catch (error) {
      console.error('Failed to write log:', error);
    }

    // Also print to console
    const color = this.getColor(level);
    console.log(`${color}[${level.toUpperCase()}]${this.reset()} ${message}`, data);
  }

  getColor(level) {
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      warning: '\x1b[33m', // Yellow
      error: '\x1b[31m',   // Red
      debug: '\x1b[35m'    // Magenta
    };
    return colors[level] || '\x1b[0m';
  }

  get reset() {
    return '\x1b[0m';
  }

  info(message, data = {}) {
    this.write('info', message, data);
  }

  success(message, data = {}) {
    this.write('success', message, data);
  }

  warning(message, data = {}) {
    this.write('warning', message, data);
  }

  error(message, data = {}) {
    this.write('error', message, data);
  }

  debug(message, data = {}) {
    this.write('debug', message, data);
  }

  async getLogs(date = null) {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const logFile = path.join(this.logsDir, `${targetDate}.log`);
      
      if (await this.fileExists(logFile)) {
        const content = await fs.readFile(logFile, 'utf-8');
        return content.split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
      }
      
      return [];
    } catch (error) {
      console.error('Get logs error:', error);
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

  async clearOldLogs(days = 7) {
    try {
      const files = await fs.readdir(this.logsDir);
      const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);

      for (const file of files) {
        const filePath = path.join(this.logsDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtimeMs < cutoff) {
          await fs.unlink(filePath);
          console.log(`🗑️ Deleted old log: ${file}`);
        }
      }
    } catch (error) {
      console.error('Clear logs error:', error);
    }
  }
}

module.exports = new Logger();

