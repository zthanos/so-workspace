/**
 * Logger utility for Diagram Previewer
 * Provides centralized logging with timestamps and log levels
 * 
 * Requirements: 6.5
 */

import * as vscode from 'vscode';

/**
 * Log levels for different types of messages
 */
export type LogLevel = 'info' | 'warning' | 'error' | 'debug';

/**
 * Logger class for Diagram Previewer
 * Manages output channel and provides structured logging
 */
export class Logger {
  private outputChannel: vscode.OutputChannel;
  private debugMode: boolean;

  /**
   * Create a new logger instance
   * @param outputChannel - VSCode output channel for logging
   * @param debugMode - Enable debug logging (default: false)
   */
  constructor(outputChannel: vscode.OutputChannel, debugMode: boolean = false) {
    this.outputChannel = outputChannel;
    this.debugMode = debugMode;
  }

  /**
   * Log an informational message
   * @param message - Message to log
   * @param context - Optional context object
   */
  info(message: string, context?: Record<string, any>): void {
    this.log('info', message, context);
  }

  /**
   * Log a warning message
   * @param message - Message to log
   * @param context - Optional context object
   */
  warning(message: string, context?: Record<string, any>): void {
    this.log('warning', message, context);
  }

  /**
   * Log an error message
   * @param message - Message to log
   * @param error - Optional error object
   * @param context - Optional context object
   */
  error(message: string, error?: Error | unknown, context?: Record<string, any>): void {
    const errorDetails = error instanceof Error 
      ? { name: error.name, message: error.message, stack: error.stack }
      : { error: String(error) };
    
    this.log('error', message, { ...context, error: errorDetails });
  }

  /**
   * Log a debug message (only if debug mode is enabled)
   * @param message - Message to log
   * @param context - Optional context object
   */
  debug(message: string, context?: Record<string, any>): void {
    if (this.debugMode) {
      this.log('debug', message, context);
    }
  }

  /**
   * Log a rendering error with file context
   * @param fileName - File being rendered
   * @param error - Error that occurred
   */
  renderError(fileName: string, error: Error | unknown): void {
    this.error('Rendering failed', error, { fileName });
  }

  /**
   * Log a configuration change
   * @param config - New configuration object
   */
  configChange(config: Record<string, any>): void {
    this.info('Configuration changed', { config });
  }

  /**
   * Log an API request
   * @param method - HTTP method
   * @param url - Request URL
   * @param options - Optional request options
   */
  apiRequest(method: string, url: string, options?: Record<string, any>): void {
    // this.debug('API Request', { method, url, options });
    const truncatedUrl = url.length > 200 ? url.substring(0, 200) + '...' : url;
    this.debug('API Request', { method, url: truncatedUrl, options });    
  }

  /**
   * Log an API response
   * @param method - HTTP method
   * @param url - Request URL
   * @param status - Response status code
   * @param duration - Request duration in milliseconds
   */
  apiResponse(method: string, url: string, status: number, duration: number): void {
    // const level = status >= 400 ? 'warning' : 'debug';
    // this.log(level, 'API Response', { method, url, status, duration: `${duration}ms` });
    const level = status >= 400 ? 'warning' : 'debug';
    const truncatedUrl = url.length > 200 ? url.substring(0, 200) + '...' : url;
    this.log(level, 'API Response', { method, url: truncatedUrl, status, duration: `${duration}ms` });

  }

  /**
   * Log an API error
   * @param method - HTTP method
   * @param url - Request URL
   * @param error - Error that occurred
   */
  apiError(method: string, url: string, error: Error | unknown): void {
    // this.error('API Request failed', error, { method, url });
    const truncatedUrl = url.length > 200 ? url.substring(0, 200) + '...' : url;
    this.error('API Request failed', error, { method, url: truncatedUrl });    
  }

  /**
   * Show the output channel
   */
  show(): void {
    this.outputChannel.show();
  }

  /**
   * Internal logging method
   * @param level - Log level
   * @param message - Message to log
   * @param context - Optional context object
   * @private
   */
  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    const prefix = this.getLevelPrefix(level);
    
    let logMessage = `${timestamp} ${prefix} ${message}`;
    
    if (context && Object.keys(context).length > 0) {
      logMessage += `\n  Context: ${JSON.stringify(context, null, 2)}`;
    }
    
    this.outputChannel.appendLine(logMessage);
  }

  /**
   * Get prefix for log level
   * @param level - Log level
   * @returns Prefix string
   * @private
   */
  private getLevelPrefix(level: LogLevel): string {
    switch (level) {
      case 'error':
        return '[ERROR]';
      case 'warning':
        return '[WARN] ';
      case 'debug':
        return '[DEBUG]';
      case 'info':
      default:
        return '[INFO] ';
    }
  }
}

/**
 * Global logger instance (initialized by extension activation)
 */
let globalLogger: Logger | undefined;

/**
 * Initialize the global logger
 * @param outputChannel - VSCode output channel
 * @param debugMode - Enable debug logging
 */
export function initializeLogger(outputChannel: vscode.OutputChannel, debugMode: boolean = false): Logger {
  globalLogger = new Logger(outputChannel, debugMode);
  return globalLogger;
}

/**
 * Get the global logger instance
 * @returns Logger instance or undefined if not initialized
 */
export function getLogger(): Logger | undefined {
  return globalLogger;
}
