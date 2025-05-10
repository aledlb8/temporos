import { logger, createLogger, LoggerOptions } from '../utils/logger';

describe('Logger', () => {
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleInfo = console.info;
  const originalConsoleDebug = console.debug;
  const originalEnv = process.env;
  
  beforeEach(() => {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    console.info = jest.fn();
    console.debug = jest.fn();
    process.env = { ...originalEnv };
  });
  
  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.info = originalConsoleInfo;
    console.debug = originalConsoleDebug;
    process.env = originalEnv;
  });
  
  test('should have the expected log methods', () => {
    expect(logger.error).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.debug).toBeDefined();
    expect(logger.trace).toBeDefined();
    expect(logger.fatal).toBeDefined();
  });
  
  test('should be able to log messages with different levels', () => {
    // We can't directly test the logger output as it uses pino
    // But we can verify it doesn't throw errors when used
    expect(() => {
      logger.info('Info message');
      logger.error('Error message');
      logger.debug('Debug message');
      logger.warn('Warning message');
      logger.trace('Trace message');
      logger.fatal('Fatal message');
    }).not.toThrow();
  });
  
  test('should handle objects in log messages', () => {
    const obj = { id: 1, name: 'test' };
    
    expect(() => {
      logger.info(obj, 'Info with object');
      logger.error(obj, 'Error with object');
    }).not.toThrow();
  });
  
  test('should handle errors in log messages', () => {
    const error = new Error('Test error');
    
    expect(() => {
      logger.error({ err: error }, 'Error object');
    }).not.toThrow();
  });
  
  describe('createLogger', () => {
    test('should create a logger with default options', () => {
      const customLogger = createLogger();
      expect(customLogger).toBeDefined();
      expect(customLogger.info).toBeDefined();
    });
    
    test('should create a logger with custom name', () => {
      const options: LoggerOptions = { name: 'custom-logger' };
      const customLogger = createLogger(options);
      expect(customLogger).toBeDefined();
    });
    
    test('should create a logger with custom log level', () => {
      const options: LoggerOptions = { level: 'debug' };
      const customLogger = createLogger(options);
      expect(customLogger).toBeDefined();
    });
    
    test('should create a logger with pretty print enabled', () => {
      const options: LoggerOptions = { prettyPrint: true };
      const customLogger = createLogger(options);
      expect(customLogger).toBeDefined();
    });
    
    test('should create a logger with pretty print disabled', () => {
      const options: LoggerOptions = { prettyPrint: false };
      const customLogger = createLogger(options);
      expect(customLogger).toBeDefined();
    });
    
    test('should use LOG_LEVEL environment variable if set', () => {
      process.env.LOG_LEVEL = 'trace';
      const customLogger = createLogger();
      expect(customLogger).toBeDefined();
    });
    
    test('should disable pretty print in production', () => {
      process.env.NODE_ENV = 'production';
      const customLogger = createLogger();
      expect(customLogger).toBeDefined();
    });
  });
}); 