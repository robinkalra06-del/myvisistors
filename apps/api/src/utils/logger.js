/**
 * Structured Logger for LiveTrack
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const currentLevel = process.env.LOG_LEVEL === 'debug' ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;

function formatMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify({ timestamp, level, message, ...meta });
  }
  const color = {
    DEBUG: '\x1b[34m',
    INFO: '\x1b[32m',
    WARN: '\x1b[33m',
    ERROR: '\x1b[31m'
  }[level] || '\x1b[0m';
  const reset = '\x1b[0m';
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${color}[${timestamp}] [${level}]${reset} ${message}${metaStr}`;
}

export const logger = {
  debug(msg, meta) {
    if (currentLevel <= LOG_LEVELS.DEBUG) console.debug(formatMessage('DEBUG', msg, meta));
  },
  info(msg, meta) {
    if (currentLevel <= LOG_LEVELS.INFO) console.log(formatMessage('INFO', msg, meta));
  },
  warn(msg, meta) {
    if (currentLevel <= LOG_LEVELS.WARN) console.warn(formatMessage('WARN', msg, meta));
  },
  error(msg, meta) {
    if (currentLevel <= LOG_LEVELS.ERROR) console.error(formatMessage('ERROR', msg, meta));
  }
};
