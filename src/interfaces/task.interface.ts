/**
 * Interface for task options
 */
export interface TaskOptions {
  /**
   * Whether the task is a batch task
   */
  batch?: boolean;

  /**
   * Custom logger function
   */
  logger?: (message: string) => void;

  /**
   * Days of the week to run the task (0-6, where 0 is Sunday)
   */
  weekdays?: number[];

  /**
   * Times of day to run the task (in 24-hour format, e.g., '14:30')
   */
  timesOfDay?: string[];

  /**
   * Task IDs that this task depends on
   */
  dependencies?: string[];

  /**
   * Timeout in milliseconds
   */
  timeout?: number;

  /**
   * Number of retry attempts
   */
  retryAttempts?: number;

  /**
   * Delay between retry attempts in milliseconds
   */
  retryDelay?: number;

  /**
   * Priority of the task (higher number = higher priority)
   */
  priority?: number;

  /**
   * Cron expression for scheduling
   */
  cronExpression?: string;

  /**
   * Task name for identification
   */
  name?: string;

  /**
   * Task description
   */
  description?: string;

  /**
   * Tags for categorizing tasks
   */
  tags?: string[];
}

/**
 * Interface for task status
 */
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused'
}

/**
 * Interface for task statistics
 */
export interface TaskStatistics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  averageExecutionTime: number;
  lastRunTime: number | null;
  lastRunStatus: TaskStatus | null;
}

/**
 * Interface for task execution result
 */
export interface TaskExecutionResult {
  taskId: string;
  status: TaskStatus;
  startTime: number;
  endTime: number;
  executionTime: number;
  error?: Error;
}

/**
 * Interface for task callback function
 */
export type TaskCallback = () => Promise<void> | void;