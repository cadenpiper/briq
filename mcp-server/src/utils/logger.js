/**
 * Simple structured logger for MCP server
 * Minimal implementation - no external dependencies
 */

const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

class Logger {
  constructor(level = LogLevel.INFO) {
    this.level = level;
  }

  debug(message, meta = {}) {
    if (this.level <= LogLevel.DEBUG) {
      this.log('DEBUG', message, meta);
    }
  }

  info(message, meta = {}) {
    if (this.level <= LogLevel.INFO) {
      this.log('INFO', message, meta);
    }
  }

  warn(message, meta = {}) {
    if (this.level <= LogLevel.WARN) {
      this.log('WARN', message, meta);
    }
  }

  error(message, meta = {}) {
    if (this.level <= LogLevel.ERROR) {
      this.log('ERROR', message, meta);
    }
  }

  log(level, message, meta) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta
    };

    const output = JSON.stringify(entry);
    
    if (level === 'ERROR') {
      console.error(output);
    } else {
      console.log(output);
    }
  }
}

// Singleton instance
const logger = new Logger(
  process.env.LOG_LEVEL === 'debug' ? LogLevel.DEBUG : LogLevel.INFO
);

export { logger, LogLevel };
