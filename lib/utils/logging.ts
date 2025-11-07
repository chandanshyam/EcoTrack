/**
 * Comprehensive logging and monitoring system for EcoTrack
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export type LogEntry = {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  userAgent?: string;
  url?: string;
  stack?: string;
}

export type LoggerConfig = {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  enableRemote: boolean;
  maxStorageEntries: number;
  remoteEndpoint?: string;
}

/**
 * Enhanced logger with multiple output targets
 */
export class Logger {
  private config: LoggerConfig;
  private sessionId: string;
  private logBuffer: LogEntry[] = [];
  private readonly maxBufferSize = 100;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableStorage: false,
      enableRemote: false,
      maxStorageEntries: 1000,
      ...config
    };

    this.sessionId = this.generateSessionId();
    this.initializeStorage();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeStorage(): void {
    if (typeof window === 'undefined' || !this.config.enableStorage) return;

    // Clean up old logs on initialization
    this.cleanupOldLogs();
  }

  private cleanupOldLogs(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('ecotrack-logs');
      if (stored) {
        const logs: LogEntry[] = JSON.parse(stored);
        const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
        
        const recentLogs = logs.filter(log => 
          new Date(log.timestamp).getTime() > cutoff
        );

        if (recentLogs.length !== logs.length) {
          localStorage.setItem('ecotrack-logs', JSON.stringify(recentLogs));
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup old logs:', error);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, any>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      metadata,
      sessionId: this.sessionId,
      userId: this.getCurrentUserId(),
      requestId: this.getCurrentRequestId(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined
    };

    if (error) {
      entry.stack = error.stack;
      entry.metadata = {
        ...entry.metadata,
        errorName: error.name,
        errorMessage: error.message
      };
    }

    return entry;
  }

  private getCurrentUserId(): string | undefined {
    // This would integrate with your auth system
    if (typeof window !== 'undefined') {
      try {
        const user = localStorage.getItem('ecotrack-user');
        return user ? JSON.parse(user).id : undefined;
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  private getCurrentRequestId(): string | undefined {
    // This would be set by middleware or request context
    if (typeof window !== 'undefined') {
      return (window as any).__requestId;
    }
    return undefined;
  }

  private outputToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return;

    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
    const levelColors = ['#888', '#007acc', '#ff8c00', '#ff4444', '#cc0000'];
    
    const prefix = `[${entry.timestamp}] [${levelNames[entry.level]}]${entry.context ? ` [${entry.context}]` : ''}`;
    const color = levelColors[entry.level];

    if (entry.level >= LogLevel.ERROR) {
      console.error(`%c${prefix}`, `color: ${color}; font-weight: bold`, entry.message, entry.metadata || '');
      if (entry.stack) {
        console.error(entry.stack);
      }
    } else if (entry.level === LogLevel.WARN) {
      console.warn(`%c${prefix}`, `color: ${color}; font-weight: bold`, entry.message, entry.metadata || '');
    } else {
      console.log(`%c${prefix}`, `color: ${color}`, entry.message, entry.metadata || '');
    }
  }

  private outputToStorage(entry: LogEntry): void {
    if (typeof window === 'undefined' || !this.config.enableStorage) return;

    try {
      const stored = localStorage.getItem('ecotrack-logs');
      const logs: LogEntry[] = stored ? JSON.parse(stored) : [];
      
      logs.push(entry);
      
      // Keep only the most recent entries
      if (logs.length > this.config.maxStorageEntries) {
        logs.splice(0, logs.length - this.config.maxStorageEntries);
      }
      
      localStorage.setItem('ecotrack-logs', JSON.stringify(logs));
    } catch (error) {
      console.warn('Failed to store log entry:', error);
    }
  }

  private bufferForRemote(entry: LogEntry): void {
    if (!this.config.enableRemote) return;

    this.logBuffer.push(entry);
    
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }

    // Send logs in batches
    if (this.logBuffer.length >= 10 || entry.level >= LogLevel.ERROR) {
      this.flushRemoteLogs();
    }
  }

  private async flushRemoteLogs(): Promise<void> {
    if (!this.config.remoteEndpoint || this.logBuffer.length === 0) return;

    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs: logsToSend })
      });
    } catch (error) {
      console.warn('Failed to send logs to remote endpoint:', error);
      // Put logs back in buffer for retry
      this.logBuffer.unshift(...logsToSend);
    }
  }

  private log(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, any>,
    error?: Error
  ): void {
    if (!this.shouldLog(level)) return;

    const entry = this.createLogEntry(level, message, context, metadata, error);

    this.outputToConsole(entry);
    this.outputToStorage(entry);
    this.bufferForRemote(entry);
  }

  debug(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context, metadata);
  }

  info(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context, metadata);
  }

  warn(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context, metadata);
  }

  error(message: string, context?: string, metadata?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, metadata, error);
  }

  fatal(message: string, context?: string, metadata?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.FATAL, message, context, metadata, error);
  }

  /**
   * Get stored logs
   */
  getLogs(level?: LogLevel): LogEntry[] {
    if (typeof window === 'undefined') return [];

    try {
      const stored = localStorage.getItem('ecotrack-logs');
      const logs: LogEntry[] = stored ? JSON.parse(stored) : [];
      
      if (level !== undefined) {
        return logs.filter(log => log.level >= level);
      }
      
      return logs;
    } catch (error) {
      console.warn('Failed to retrieve logs:', error);
      return [];
    }
  }

  /**
   * Clear stored logs
   */
  clearLogs(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem('ecotrack-logs');
    } catch (error) {
      console.warn('Failed to clear logs:', error);
    }
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    const logs = this.getLogs();
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Get logging statistics
   */
  getStats(): Record<string, number> {
    const logs = this.getLogs();
    const stats: Record<string, number> = {
      total: logs.length,
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      fatal: 0
    };

    logs.forEach(log => {
      switch (log.level) {
        case LogLevel.DEBUG: stats.debug++; break;
        case LogLevel.INFO: stats.info++; break;
        case LogLevel.WARN: stats.warn++; break;
        case LogLevel.ERROR: stats.error++; break;
        case LogLevel.FATAL: stats.fatal++; break;
      }
    });

    return stats;
  }

  /**
   * Force flush remote logs
   */
  async flush(): Promise<void> {
    await this.flushRemoteLogs();
  }
}

/**
 * User behavior analytics
 */
export class AnalyticsTracker {
  private events: Array<{
    event: string;
    timestamp: string;
    properties?: Record<string, any>;
  }> = [];

  private sessionStart = Date.now();

  track(event: string, properties?: Record<string, any>): void {
    this.events.push({
      event,
      timestamp: new Date().toISOString(),
      properties: {
        ...properties,
        sessionDuration: Date.now() - this.sessionStart,
        url: typeof window !== 'undefined' ? window.location.href : undefined
      }
    });

    // Log the event
    logger.info(`Analytics: ${event}`, 'analytics', properties);
  }

  trackPageView(page: string): void {
    this.track('page_view', { page });
  }

  trackUserAction(action: string, target?: string, metadata?: Record<string, any>): void {
    this.track('user_action', { action, target, ...metadata });
  }

  trackError(error: Error, context?: string): void {
    this.track('error', {
      errorName: error.name,
      errorMessage: error.message,
      context,
      stack: error.stack
    });
  }

  trackPerformance(metric: string, value: number, unit?: string): void {
    this.track('performance', { metric, value, unit });
  }

  getEvents(): Array<any> {
    return [...this.events];
  }

  clearEvents(): void {
    this.events = [];
  }
}

/**
 * System health monitor
 */
export class HealthMonitor {
  private checks: Map<string, () => Promise<boolean>> = new Map();
  private lastResults: Map<string, { healthy: boolean; timestamp: number; error?: string }> = new Map();

  addCheck(name: string, checkFn: () => Promise<boolean>): void {
    this.checks.set(name, checkFn);
  }

  async runCheck(name: string): Promise<{ healthy: boolean; error?: string }> {
    const checkFn = this.checks.get(name);
    if (!checkFn) {
      return { healthy: false, error: 'Check not found' };
    }

    try {
      const healthy = await checkFn();
      const result = { healthy, timestamp: Date.now() };
      this.lastResults.set(name, result);
      
      if (!healthy) {
        logger.warn(`Health check failed: ${name}`, 'health-monitor');
      }
      
      return { healthy };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const result = { healthy: false, timestamp: Date.now(), error: errorMessage };
      this.lastResults.set(name, result);
      
      logger.error(`Health check error: ${name}`, 'health-monitor', { error: errorMessage });
      
      return { healthy: false, error: errorMessage };
    }
  }

  async runAllChecks(): Promise<Record<string, { healthy: boolean; error?: string }>> {
    const results: Record<string, { healthy: boolean; error?: string }> = {};
    
    const checkNames = Array.from(this.checks.keys());
    for (const name of checkNames) {
      results[name] = await this.runCheck(name);
    }
    
    return results;
  }

  getLastResults(): Record<string, { healthy: boolean; timestamp: number; error?: string }> {
    const results: Record<string, any> = {};
    this.lastResults.forEach((result, name) => {
      results[name] = result;
    });
    return results;
  }

  isHealthy(): boolean {
    let healthy = true;
    this.lastResults.forEach((result) => {
      if (!result.healthy) {
        healthy = false;
      }
    });
    return healthy;
  }
}

// Create singleton instances
export const logger = new Logger({
  level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
  enableConsole: true,
  enableStorage: true,
  enableRemote: process.env.NODE_ENV === 'production',
  remoteEndpoint: process.env.NEXT_PUBLIC_LOGGING_ENDPOINT
});

export const analytics = new AnalyticsTracker();
export const healthMonitor = new HealthMonitor();

// Set up basic health checks
healthMonitor.addCheck('localStorage', async () => {
  if (typeof window === 'undefined') return true;
  try {
    const testKey = 'health-check-test';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
});

healthMonitor.addCheck('fetch', async () => {
  try {
    const response = await fetch('/api/health', { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
});

// Auto-flush logs periodically
if (typeof window !== 'undefined') {
  setInterval(() => {
    logger.flush().catch(error => {
      console.warn('Failed to flush logs:', error);
    });
  }, 30000); // Every 30 seconds

  // Track page visibility changes
  document.addEventListener('visibilitychange', () => {
    analytics.track('page_visibility_change', {
      visible: !document.hidden
    });
  });

  // Track errors globally
  window.addEventListener('error', (event) => {
    logger.error('Global error', 'window', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    }, event.error);
    
    analytics.trackError(event.error || new Error(event.message), 'global');
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection', 'window', {
      reason: event.reason
    });
    
    analytics.trackError(
      event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      'unhandled-promise'
    );
  });
}