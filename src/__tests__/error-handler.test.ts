import { createError, ErrorCode, handleError, TemporosError } from '../utils/error-handler';
import { logger } from '../utils/logger';

// Mock the logger
jest.mock('../utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('Error Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('TemporosError', () => {
    test('should create a TemporosError with the given message and code', () => {
      const message = 'Test error message';
      const code = ErrorCode.INVALID_PARAMETER;
      
      const error = new TemporosError(message, code);
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe(message);
      expect(error.code).toBe(code);
      expect(error.name).toBe('TemporosError');
    });
    
    test('should include additional details if provided', () => {
      const message = 'Test error message';
      const code = ErrorCode.TASK_NOT_FOUND;
      const details = { taskId: '123', timestamp: Date.now() };
      
      const error = new TemporosError(message, code, details);
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe(message);
      expect(error.code).toBe(code);
      expect(error.details).toEqual(details);
    });
  });
  
  describe('createError', () => {
    test('should create a TemporosError with the given message and code', () => {
      const message = 'Test error message';
      const code = ErrorCode.INVALID_PARAMETER;
      
      const error = createError(message, code);
      
      expect(error).toBeInstanceOf(TemporosError);
      expect(error.message).toBe(message);
      expect(error.code).toBe(code);
    });
    
    test('should include additional details if provided', () => {
      const message = 'Test error message';
      const code = ErrorCode.TASK_NOT_FOUND;
      const details = { taskId: '123', timestamp: Date.now() };
      
      const error = createError(message, code, details);
      
      expect(error).toBeInstanceOf(TemporosError);
      expect(error.message).toBe(message);
      expect(error.code).toBe(code);
      expect(error.details).toEqual(details);
    });
  });
  
  describe('handleError', () => {
    test('should log the error and return it', () => {
      const error = new Error('Test error');
      
      const result = handleError(error);
      
      expect(logger.error).toHaveBeenCalled();
      expect(result).toBe(error);
    });
    
    test('should handle TemporosError objects', () => {
      const error = createError('Test error with code', ErrorCode.TASK_EXECUTION_FAILED);
      
      const result = handleError(error);
      
      expect(logger.error).toHaveBeenCalled();
      expect(result).toBe(error);
    });
    
    test('should handle errors with details property', () => {
      const error = createError(
        'Test error with details', 
        ErrorCode.TASK_NOT_FOUND, 
        { details: 'Additional error details' }
      );
      
      const result = handleError(error);
      
      expect(logger.error).toHaveBeenCalled();
      expect(result).toBe(error);
    });
    
    test('should throw the error if throwError is true', () => {
      const error = new Error('Test error');
      
      expect(() => {
        handleError(error, true);
      }).toThrow('Test error');
    });
    
    test('should include additional context if provided', () => {
      const error = new Error('Test error');
      const context = { source: 'test', timestamp: Date.now() };
      
      const result = handleError(error, false, context);
      
      expect(logger.error).toHaveBeenCalled();
      expect(result).toBe(error);
    });
  });
  
  describe('ErrorCode', () => {
    test('should have the expected error codes', () => {
      expect(ErrorCode.TASK_NOT_FOUND).toBeDefined();
      expect(ErrorCode.TASK_ALREADY_RUNNING).toBeDefined();
      expect(ErrorCode.TASK_EXECUTION_FAILED).toBeDefined();
      expect(ErrorCode.TASK_TIMEOUT).toBeDefined();
      expect(ErrorCode.INVALID_CRON_EXPRESSION).toBeDefined();
      expect(ErrorCode.INVALID_PARAMETER).toBeDefined();
      expect(ErrorCode.CONCURRENCY_LIMIT_REACHED).toBeDefined();
      expect(ErrorCode.DEPENDENCY_NOT_MET).toBeDefined();
      expect(ErrorCode.WORKER_NOT_FOUND).toBeDefined();
      expect(ErrorCode.SERIALIZATION_ERROR).toBeDefined();
    });
  });
}); 