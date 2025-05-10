import os from 'os';
import { IConcurrencyMonitor } from '../interfaces/concurrency.interface';
import { logger } from '../utils/logger';
import { getConfig } from '../config';
import EventEmitter from 'events';

/**
 * Monitors system resources and adjusts concurrency limits
 */
export class ConcurrencyMonitor extends EventEmitter implements IConcurrencyMonitor {
  /**
   * Maximum concurrency level
   */
  private maxConcurrency: number;

  /**
   * Interval ID for the monitor
   */
  private monitorInterval: NodeJS.Timeout | null;

  /**
   * The scheduler instance to update
   */
  private scheduler: { setMaxConcurrency: (max: number) => void };

  /**
   * Create a new concurrency monitor
   * @param scheduler - The scheduler instance to update
   */
  constructor(scheduler: { setMaxConcurrency: (max: number) => void }) {
    super();

    this.scheduler = scheduler;
    this.maxConcurrency = getConfig().defaultMaxConcurrency;
    this.monitorInterval = null;

    logger.debug('ConcurrencyMonitor initialized');
  }

  /**
   * Start the concurrency monitor
   * @param interval - The interval in milliseconds at which to check system resources
   */
  start(interval = getConfig().concurrencyMonitorInterval): void {
    if (this.monitorInterval) {
      return;
    }

    this.monitorInterval = setInterval(() => {
      this.adjustConcurrency();
    }, interval);

    logger.debug({ monitorInterval: interval }, 'ConcurrencyMonitor started');

    // Emit event
    this.emit('started', interval);
  }

  /**
   * Stop the concurrency monitor
   */
  stop(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;

      logger.debug('ConcurrencyMonitor stopped');

      // Emit event
      this.emit('stopped');
    }
  }

  /**
   * Set the maximum concurrency level
   * @param max - The maximum number of concurrent tasks
   */
  setMaxConcurrency(max: number): void {
    if (typeof max !== 'number' || max <= 0) {
      logger.warn({ max }, 'Invalid max concurrency value, ignoring');
      return;
    }

    this.maxConcurrency = max;
    this.scheduler.setMaxConcurrency(max);

    logger.debug({ maxConcurrency: max }, `Max concurrency set to ${max}`);

    // Emit event
    this.emit('maxConcurrencyChanged', max);
  }

  /**
   * Get the current maximum concurrency level
   * @returns The current maximum concurrency level
   */
  getMaxConcurrency(): number {
    return this.maxConcurrency;
  }

  /**
   * Get the current system load
   * @returns The current system load as a percentage
   */
  getSystemLoad(): number {
    const load = os.loadavg()[0];
    const cpuCount = os.cpus().length;
    const loadPercentage = (load / cpuCount) * 100;

    return Math.min(100, Math.max(0, loadPercentage));
  }

  /**
   * Adjust concurrency based on system load
   */
  private adjustConcurrency(): void {
    const currentLoad = this.getSystemLoad();
    const cpuCount = os.cpus().length;
    const maxLoadPercentage = getConfig().maxSystemLoadPercentage;

    // Calculate available concurrency based on system load
    let availableConcurrency: number;

    if (currentLoad >= maxLoadPercentage) {
      // System is under heavy load, reduce concurrency
      availableConcurrency = Math.max(1, Math.floor(cpuCount / 2));
    } else {
      // Calculate concurrency based on available resources
      const loadRatio = currentLoad / maxLoadPercentage;
      availableConcurrency = Math.max(1, Math.floor(cpuCount * (1 - loadRatio)));
    }

    if (availableConcurrency !== this.maxConcurrency) {
      logger.debug(
        {
          currentLoad,
          cpuCount,
          maxLoadPercentage,
          previousConcurrency: this.maxConcurrency,
          newConcurrency: availableConcurrency,
        },
        `Adjusting concurrency from ${this.maxConcurrency} to ${availableConcurrency}`
      );

      this.setMaxConcurrency(availableConcurrency);

      // Emit event
      this.emit('concurrencyAdjusted', availableConcurrency, currentLoad);
    }
  }
}