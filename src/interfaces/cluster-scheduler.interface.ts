import { TaskCallback, TaskOptions } from './task.interface';

/**
 * Interface for the cluster scheduler
 */
export interface IClusterScheduler {
  /**
   * Start the cluster scheduler
   */
  start(): void;

  /**
   * Stop the cluster scheduler
   */
  stop(): void;

  /**
   * Schedule a task to run at a specified interval
   * @param callback - The function to execute
   * @param interval - The interval in milliseconds
   * @param options - Optional configuration for the task
   * @returns The ID of the scheduled task
   */
  scheduleTask(callback: TaskCallback, interval: number, options?: TaskOptions): string;

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
   * Get the IDs of all running tasks
   * @returns A promise that resolves to an object mapping worker IDs to arrays of task IDs
   */
  getRunningTasks(): Promise<Record<string, string[]>>;

  /**
   * Get the number of workers in the cluster
   * @returns The number of workers
   */
  getWorkerCount(): number;

  /**
   * Add a worker to the cluster
   * @returns The ID of the new worker
   */
  addWorker(): string;

  /**
   * Remove a worker from the cluster
   * @param workerId - The ID of the worker to remove
   * @returns True if the worker was removed, false otherwise
   */
  removeWorker(workerId: string): boolean;
} 