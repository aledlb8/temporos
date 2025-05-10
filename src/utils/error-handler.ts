import { logger } from './logger';

/**
 * Custom error class for Temporos
 */
export class TemporosError extends Error {
  /**
   * Error code
   */
  code: string;

  /**
   * Additional error details
   */
  details?: Record<string, unknown>;

  /**
   * Create a new TemporosError
   * @param message - Error message
   * @param code - Error code
   * @param details - Additional error details
   */
  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'TemporosError';
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error codes
 */
export enum ErrorCode {
  TASK_NOT_FOUND = 'TASK_NOT_FOUND',
  TASK_ALREADY_RUNNING = 'TASK_ALREADY_RUNNING',
  TASK_EXECUTION_FAILED = 'TASK_EXECUTION_FAILED',
  TASK_TIMEOUT = 'TASK_TIMEOUT',
  INVALID_CRON_EXPRESSION = 'INVALID_CRON_EXPRESSION',
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  CONCURRENCY_LIMIT_REACHED = 'CONCURRENCY_LIMIT_REACHED',
  DEPENDENCY_NOT_MET = 'DEPENDENCY_NOT_MET',
  WORKER_NOT_FOUND = 'WORKER_NOT_FOUND',
  SERIALIZATION_ERROR = 'SERIALIZATION_ERROR',
}

/**
 * Handle an error by logging it and optionally throwing it
 * @param error - The error to handle
 * @param throwError - Whether to throw the error after logging it
 * @param context - Additional context for the error
 * @returns The original error
 */
export function handleError(
  error: Error | TemporosError,
  throwError = false,
  context?: Record<string, unknown>
): Error {
  if (error instanceof TemporosError) {
    logger.error(
      {
        err: error,
        code: error.code,
        details: error.details,
        ...context,
      },
      `${error.name}: ${error.message}`
    );
  } else {
    logger.error(
      {
        err: error,
        ...context,
      },
      `Error: ${error.message}`
    );
  }

  if (throwError) {
    throw error;
  }

  return error;
}

/**
 * Create a new TemporosError
 * @param message - Error message
 * @param code - Error code
 * @param details - Additional error details
 * @returns A new TemporosError
 */
export function createError(
  message: string,
  code: ErrorCode,
  details?: Record<string, unknown>
): TemporosError {
  return new TemporosError(message, code, details);
} 