/**
 * Configuration options for Temporos
 */
export interface TemporosConfig {
  /**
   * Default interval for checking tasks (in milliseconds)
   */
  defaultCheckInterval: number;
  
  /**
   * Default maximum concurrency
   */
  defaultMaxConcurrency: number;
  
  /**
   * Default retry attempts
   */
  defaultRetryAttempts: number;
  
  /**
   * Default retry delay (in milliseconds)
   */
  defaultRetryDelay: number;
  
  /**
   * Default task timeout (in milliseconds)
   */
  defaultTaskTimeout: number;
  
  /**
   * Whether to use dynamic concurrency by default
   */
  useDynamicConcurrency: boolean;
  
  /**
   * Default concurrency monitor interval (in milliseconds)
   */
  concurrencyMonitorInterval: number;
  
  /**
   * Maximum system load percentage before reducing concurrency
   */
  maxSystemLoadPercentage: number;
  
  /**
   * Whether to persist task history
   */
  persistTaskHistory: boolean;
  
  /**
   * Maximum number of task history entries to keep per task
   */
  maxTaskHistoryEntries: number;
  
  /**
   * Whether to enable metrics collection
   */
  enableMetrics: boolean;
}

/**
 * Default configuration
 */
export const defaultConfig: TemporosConfig = {
  defaultCheckInterval: 1000,
  defaultMaxConcurrency: 10,
  defaultRetryAttempts: 3,
  defaultRetryDelay: 1000,
  defaultTaskTimeout: 30000,
  useDynamicConcurrency: false,
  concurrencyMonitorInterval: 5000,
  maxSystemLoadPercentage: 80,
  persistTaskHistory: true,
  maxTaskHistoryEntries: 100,
  enableMetrics: true,
};

/**
 * Current configuration
 */
let config = { ...defaultConfig };

/**
 * Get the current configuration
 * @returns The current configuration
 */
export function getConfig(): TemporosConfig {
  return { ...config };
}

/**
 * Update the configuration
 * @param newConfig - New configuration options
 * @returns The updated configuration
 */
export function updateConfig(newConfig: Partial<TemporosConfig>): TemporosConfig {
  config = {
    ...config,
    ...newConfig,
  };
  return getConfig();
} 