/**
 * Interface for the concurrency monitor
 */
export interface IConcurrencyMonitor {
  /**
   * Start the concurrency monitor
   * @param interval - The interval in milliseconds at which to check system resources
   */
  start(interval?: number): void;

  /**
   * Stop the concurrency monitor
   */
  stop(): void;

  /**
   * Set the maximum concurrency level
   * @param max - The maximum number of concurrent tasks
   */
  setMaxConcurrency(max: number): void;

  /**
   * Get the current maximum concurrency level
   * @returns The current maximum concurrency level
   */
  getMaxConcurrency(): number;

  /**
   * Get the current system load
   * @returns The current system load as a percentage
   */
  getSystemLoad(): number;
}