// Logger Utility for Debugging and Monitoring

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
};

class Logger {
  constructor(options = {}) {
    this.level = options.level || LOG_LEVELS.INFO;
    this.prefix = options.prefix || '';
    this.enableTimestamp = options.enableTimestamp !== false;
    this.enableStackTrace = options.enableStackTrace || false;
    this.handlers = options.handlers || [];
    this.isDevelopment = import.meta.env.DEV;
  }

  setLevel(level) {
    this.level = level;
  }

  addHandler(handler) {
    this.handlers.push(handler);
  }

  removeHandler(handler) {
    this.handlers = this.handlers.filter(h => h !== handler);
  }

  formatMessage(level, message, data) {
    const parts = [];

    if (this.enableTimestamp) {
      parts.push(`[${new Date().toISOString()}]`);
    }

    parts.push(`[${level}]`);

    if (this.prefix) {
      parts.push(`[${this.prefix}]`);
    }

    parts.push(message);

    return parts.join(' ');
  }

  log(level, levelName, message, data) {
    if (level < this.level) return;

    const formattedMessage = this.formatMessage(levelName, message, data);

    // Console output
    const consoleMethod = this.getConsoleMethod(levelName);
    if (data !== undefined) {
      console[consoleMethod](formattedMessage, data);
    } else {
      console[consoleMethod](formattedMessage);
    }

    // Stack trace for errors
    if (this.enableStackTrace && levelName === 'ERROR') {
      console.trace();
    }

    // Custom handlers
    this.handlers.forEach(handler => {
      try {
        handler({
          level: levelName,
          message,
          data,
          timestamp: new Date(),
          prefix: this.prefix,
        });
      } catch (error) {
        console.error('Logger handler error:', error);
      }
    });
  }

  getConsoleMethod(level) {
    switch (level) {
      case 'DEBUG':
        return 'debug';
      case 'INFO':
        return 'info';
      case 'WARN':
        return 'warn';
      case 'ERROR':
        return 'error';
      default:
        return 'log';
    }
  }

  debug(message, data) {
    this.log(LOG_LEVELS.DEBUG, 'DEBUG', message, data);
  }

  info(message, data) {
    this.log(LOG_LEVELS.INFO, 'INFO', message, data);
  }

  warn(message, data) {
    this.log(LOG_LEVELS.WARN, 'WARN', message, data);
  }

  error(message, data) {
    this.log(LOG_LEVELS.ERROR, 'ERROR', message, data);
  }

  // Specialized logging methods
  api(method, url, data) {
    this.debug(`API ${method} ${url}`, data);
  }

  apiSuccess(method, url, response) {
    this.info(`API ${method} ${url} - Success`, response);
  }

  apiError(method, url, error) {
    this.error(`API ${method} ${url} - Error`, error);
  }

  component(componentName, action, data) {
    this.debug(`[${componentName}] ${action}`, data);
  }

  performance(label, duration) {
    this.info(`Performance: ${label} took ${duration}ms`);
  }

  user(action, data) {
    this.info(`User action: ${action}`, data);
  }

  // Group logging
  group(label) {
    if (this.isDevelopment) {
      console.group(label);
    }
  }

  groupEnd() {
    if (this.isDevelopment) {
      console.groupEnd();
    }
  }

  // Table logging
  table(data) {
    if (this.isDevelopment && this.level <= LOG_LEVELS.DEBUG) {
      console.table(data);
    }
  }

  // Assert logging
  assert(condition, message) {
    if (this.isDevelopment && !condition) {
      console.assert(condition, message);
    }
  }

  // Time tracking
  time(label) {
    if (this.isDevelopment) {
      console.time(label);
    }
  }

  timeEnd(label) {
    if (this.isDevelopment) {
      console.timeEnd(label);
    }
  }
}

// Create default logger instance
const logger = new Logger({
  level: import.meta.env.DEV ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN,
  enableTimestamp: true,
  enableStackTrace: import.meta.env.DEV,
});

// Performance logger
export class PerformanceLogger {
  constructor(logger) {
    this.logger = logger;
    this.marks = new Map();
  }

  start(label) {
    this.marks.set(label, performance.now());
  }

  end(label) {
    const startTime = this.marks.get(label);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.logger.performance(label, duration.toFixed(2));
      this.marks.delete(label);
      return duration;
    }
    return null;
  }

  measure(label, callback) {
    this.start(label);
    const result = callback();
    this.end(label);
    return result;
  }

  async measureAsync(label, callback) {
    this.start(label);
    const result = await callback();
    this.end(label);
    return result;
  }
}

// Error logger with context
export class ErrorLogger {
  constructor(logger) {
    this.logger = logger;
  }

  log(error, context = {}) {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...context,
    };

    this.logger.error('Application Error', errorInfo);

    // Send to error tracking service (e.g., Sentry)
    if (window.Sentry) {
      window.Sentry.captureException(error, { extra: context });
    }
  }

  logApiError(error, request) {
    this.log(error, {
      type: 'API_ERROR',
      method: request.method,
      url: request.url,
      status: error.response?.status,
      data: error.response?.data,
    });
  }

  logComponentError(error, componentName, props) {
    this.log(error, {
      type: 'COMPONENT_ERROR',
      component: componentName,
      props,
    });
  }
}

// Create specialized loggers
export const performanceLogger = new PerformanceLogger(logger);
export const errorLogger = new ErrorLogger(logger);

// Create namespaced loggers
export function createLogger(namespace) {
  return new Logger({
    prefix: namespace,
    level: logger.level,
    enableTimestamp: logger.enableTimestamp,
    enableStackTrace: logger.enableStackTrace,
  });
}

// Log storage handler (for debugging)
export class LogStorageHandler {
  constructor(maxLogs = 100) {
    this.logs = [];
    this.maxLogs = maxLogs;
  }

  handle(logEntry) {
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  getLogs() {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
  }

  export() {
    return JSON.stringify(this.logs, null, 2);
  }

  download() {
    const data = this.export();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Remote logging handler (send logs to server)
export class RemoteLogHandler {
  constructor(endpoint) {
    this.endpoint = endpoint;
    this.queue = [];
    this.flushInterval = 5000; // 5 seconds
    this.maxQueueSize = 50;
    this.startFlushing();
  }

  handle(logEntry) {
    this.queue.push(logEntry);
    if (this.queue.length >= this.maxQueueSize) {
      this.flush();
    }
  }

  startFlushing() {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  async flush() {
    if (this.queue.length === 0) return;

    const logs = [...this.queue];
    this.queue = [];

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs }),
      });
    } catch (error) {
      console.error('Failed to send logs to server:', error);
      // Re-add logs to queue
      this.queue.unshift(...logs);
    }
  }

  stop() {
    clearInterval(this.flushTimer);
    this.flush();
  }
}

export { LOG_LEVELS };
export default logger;

// Usage examples:
/*
// Basic logging
import logger from './lib/logger';

logger.debug('Debug message', { data: 'value' });
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message', error);

// API logging
logger.api('GET', '/api/members');
logger.apiSuccess('GET', '/api/members', response);
logger.apiError('POST', '/api/members', error);

// Component logging
logger.component('MemberList', 'mounted', { props });
logger.component('MemberList', 'data loaded', { count: members.length });

// Performance logging
import { performanceLogger } from './lib/logger';

performanceLogger.start('fetchMembers');
await fetchMembers();
performanceLogger.end('fetchMembers');

// Or use measure
const result = await performanceLogger.measureAsync('fetchMembers', async () => {
  return await fetchMembers();
});

// Error logging
import { errorLogger } from './lib/logger';

try {
  await saveData();
} catch (error) {
  errorLogger.log(error, { context: 'saving member data' });
}

// Namespaced logger
import { createLogger } from './lib/logger';

const apiLogger = createLogger('API');
apiLogger.info('Request sent');

// Log storage
import logger, { LogStorageHandler } from './lib/logger';

const storage = new LogStorageHandler();
logger.addHandler(storage.handle.bind(storage));

// Later, download logs
storage.download();

// Remote logging
import logger, { RemoteLogHandler } from './lib/logger';

const remoteHandler = new RemoteLogHandler('/api/logs');
logger.addHandler(remoteHandler.handle.bind(remoteHandler));

// React component example
import logger from './lib/logger';

function MyComponent() {
  useEffect(() => {
    logger.component('MyComponent', 'mounted');
    return () => logger.component('MyComponent', 'unmounted');
  }, []);

  const handleClick = () => {
    logger.user('button clicked', { button: 'save' });
  };

  return <button onClick={handleClick}>Save</button>;
}
*/
