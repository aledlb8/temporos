import { TaskCallback, TaskOptions, TaskExecutionResult } from './task.interface';

/**
 * Interface for the scheduler
 */
export interface IScheduler {
  /**
   * Schedule a task to run at a specified interval
   * @param callback - The function to execute
   * @param interval - The interval in milliseconds
   * @param options - Optional configuration for the task
   * @returns The ID of the scheduled task
   */
  scheduleTask(callback: TaskCallback, interval: number, options?: TaskOptions): string;

  /**
   * Schedule a task using a cron expression
   * @param callback - The function to execute
   * @param cronExpression - The cron expression
   * @param options - Optional configuration for the task
   * @returns The ID of the scheduled task
   */
  scheduleCronTask(callback: TaskCallback, cronExpression: string, options?: TaskOptions): string;

  /**
   * Cancel a scheduled task
   * @param taskId - The ID of the task to cancel
   * @returns True if the task was cancelled, false otherwise
   */
  cancelTask(taskId: string): boolean;

  /**
   * Set the maximum number of tasks that can run concurrently
   * @param max - The maximum number of concurrent tasks
   */
  setMaxConcurrency(max: number): void;

  /**
   * Prioritize a task
   * @param taskId - The ID of the task to prioritize
   * @param priority - The priority level (higher = more important)
   * @returns True if the task was prioritized, false otherwise
   */
  prioritizeTask(taskId: string, priority: number): boolean;

  /**
   * Get the IDs of all running tasks
   * @returns An array of task IDs
   */
  getRunningTasks(): string[];

  /**
   * Pause a task
   * @param taskId - The ID of the task to pause
   * @returns True if the task was paused, false otherwise
   */
  pauseTask(taskId: string): boolean;

  /**
   * Resume a paused task
   * @param taskId - The ID of the task to resume
   * @returns True if the task was resumed, false otherwise
   */
  resumeTask(taskId: string): boolean;

  /**
   * Get statistics for a task
   * @param taskId - The ID of the task
   * @returns The task statistics or null if the task doesn't exist
   */
  getTaskStatistics(taskId: string): Promise<TaskExecutionResult[]>;

  /**
   * Stop the scheduler and cancel all tasks
   */
  stop(): void;
} 