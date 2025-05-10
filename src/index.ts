import { Task } from './core/task';
import { Scheduler } from './core/scheduler';
import { ClusterScheduler } from './core/cluster-scheduler';
import { ConcurrencyMonitor } from './core/concurrency-monitor';
import { logger } from './utils/logger';
import { TemporosError, ErrorCode } from './utils/error-handler';
import { getConfig, updateConfig, TemporosConfig } from './config';
import {
  TaskCallback,
  TaskOptions,
  TaskStatus,
  TaskStatistics,
  TaskExecutionResult,
} from './interfaces/task.interface';
import { IScheduler } from './interfaces/scheduler.interface';
import { IClusterScheduler } from './interfaces/cluster-scheduler.interface';
import { IConcurrencyMonitor } from './interfaces/concurrency.interface';

/**
 * Create the default scheduler instance
 */
const scheduler = new Scheduler();

/**
 * Create the concurrency monitor instance
 */
const concurrencyMonitor = new ConcurrencyMonitor(scheduler);

/**
 * Main Temporos API
 */
export default {
  /**
   * Task class for creating custom tasks
   */
  Task,

  /**
   * Scheduler class for creating custom schedulers
   */
  Scheduler,

  /**
   * ClusterScheduler class for creating distributed schedulers
   */
  ClusterScheduler,

  /**
   * Error types
   */
  TemporosError,

  /**
   * Error codes
   */
  ErrorCode,

  /**
   * Task status enum
   */
  TaskStatus,

  /**
   * Schedule a task to run at a specified interval
   * @param callback - The function to execute
   * @param interval - The interval in milliseconds
   * @param options - Optional configuration for the task
   * @returns The ID of the scheduled task
   */
  scheduleTask(callback: TaskCallback, interval: number, options?: TaskOptions): string {
    return scheduler.scheduleTask(callback, interval, options);
  },

  /**
   * Schedule a task using a cron expression
   * @param callback - The function to execute
   * @param cronExpression - The cron expression
   * @param options - Optional configuration for the task
   * @returns The ID of the scheduled task
   */
  scheduleCronTask(callback: TaskCallback, cronExpression: string, options?: TaskOptions): string {
    return scheduler.scheduleCronTask(callback, cronExpression, options);
  },

  /**
   * Cancel a scheduled task
   * @param taskId - The ID of the task to cancel
   * @returns True if the task was cancelled, false otherwise
   */
  cancelTask(taskId: string): boolean {
    return scheduler.cancelTask(taskId);
  },

  /**
   * Set the maximum number of tasks that can run concurrently
   * @param max - The maximum number of concurrent tasks
   */
  setMaxConcurrency(max: number): void {
    scheduler.setMaxConcurrency(max);
  },

  /**
   * Prioritize a task
   * @param taskId - The ID of the task to prioritize
   * @param priority - The priority level (higher = more important)
   * @returns True if the task was prioritized, false otherwise
   */
  prioritizeTask(taskId: string, priority: number): boolean {
    return scheduler.prioritizeTask(taskId, priority);
  },

  /**
   * Get the IDs of all running tasks
   * @returns An array of task IDs
   */
  getRunningTasks(): string[] {
    return scheduler.getRunningTasks();
  },

  /**
   * Pause a task
   * @param taskId - The ID of the task to pause
   * @returns True if the task was paused, false otherwise
   */
  pauseTask(taskId: string): boolean {
    return scheduler.pauseTask(taskId);
  },

  /**
   * Resume a paused task
   * @param taskId - The ID of the task to resume
   * @returns True if the task was resumed, false otherwise
   */
  resumeTask(taskId: string): boolean {
    return scheduler.resumeTask(taskId);
  },

  /**
   * Get statistics for a task
   * @param taskId - The ID of the task
   * @returns A promise that resolves to the task statistics
   */
  getTaskStatistics(taskId: string): Promise<TaskExecutionResult[]> {
    return scheduler.getTaskStatistics(taskId);
  },

  /**
   * Start the concurrency monitor
   * @param interval - The interval in milliseconds at which to check system resources
   */
  startConcurrencyMonitor(interval?: number): void {
    concurrencyMonitor.start(interval);
  },

  /**
   * Stop the concurrency monitor
   */
  stopConcurrencyMonitor(): void {
    concurrencyMonitor.stop();
  },

  /**
   * Get the current configuration
   * @returns The current configuration
   */
  getConfig,

  /**
   * Update the configuration
   * @param newConfig - New configuration options
   * @returns The updated configuration
   */
  updateConfig,

  /**
   * Create a new cluster scheduler
   * @param numWorkers - Number of worker processes (defaults to CPU count)
   * @returns A new cluster scheduler instance
   */
  createClusterScheduler(numWorkers?: number): IClusterScheduler {
    return new ClusterScheduler(numWorkers);
  },
};

// Export types for TypeScript users
export {
  TaskCallback,
  TaskOptions,
  TaskStatus,
  TaskStatistics,
  TaskExecutionResult,
  IScheduler,
  IClusterScheduler,
  IConcurrencyMonitor,
  TemporosConfig,
};