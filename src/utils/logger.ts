import pino from 'pino';

/**
 * Logger configuration options
 */
export interface LoggerOptions {
  /**
   * The name of the logger
   */
  name?: string;
  
  /**
   * The log level
   */
  level?: string;
  
  /**
   * Whether to pretty print logs
   */
  prettyPrint?: boolean;
}

/**
 * Create a logger instance
 * @param options - Logger configuration options
 * @returns A Pino logger instance
 */
export function createLogger(options: LoggerOptions = {}): pino.Logger {
  const defaultOptions = {
    name: 'temporos',
    level: process.env.LOG_LEVEL || 'info',
    prettyPrint: process.env.NODE_ENV !== 'production',
  };
  
  const loggerOptions = {
    ...defaultOptions,
    ...options,
  };
  
  const transport = loggerOptions.prettyPrint
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined;
  
  return pino({
    name: loggerOptions.name,
    level: loggerOptions.level,
    transport,
  });
}

/**
 * Default logger instance
 */
export const logger = createLogger(); 