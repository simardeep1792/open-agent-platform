// Production-grade structured logging utility

export interface LogContext {
  [key: string]: any;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export class Logger {
  private readonly component: string;
  private readonly logLevel: LogLevel;

  constructor(component: string, logLevel: LogLevel = 'info') {
    this.component = component;
    this.logLevel = logLevel;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      this.writeLog('debug', message, context);
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      this.writeLog('info', message, context);
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      this.writeLog('warn', message, context);
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog('error')) {
      this.writeLog('error', message, context);
    }
  }

  fatal(message: string, context?: LogContext): void {
    this.writeLog('fatal', message, context);
    process.exit(1);
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error', 'fatal'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private writeLog(level: LogLevel, message: string, context?: LogContext): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      component: this.component,
      message,
      ...context
    };

    // In production, this would typically go to a structured logging system
    // For now, we'll use console with structured JSON output
    if (level === 'error' || level === 'fatal') {
      console.error(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }

  // Create child logger with additional context
  child(additionalContext: LogContext): Logger {
    const childLogger = new Logger(this.component, this.logLevel);
    
    // Override writeLog to include additional context
    const originalWriteLog = childLogger.writeLog.bind(childLogger);
    childLogger.writeLog = (level: LogLevel, message: string, context?: LogContext) => {
      originalWriteLog(level, message, { ...additionalContext, ...context });
    };

    return childLogger;
  }
}