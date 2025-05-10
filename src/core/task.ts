import { v4 as uuidv4 } from 'uuid';
import { CronExpressionParser } from 'cron-parser';
import { TaskCallback, TaskOptions, TaskStatus, TaskStatistics, TaskExecutionResult } from '../interfaces/task.interface';
import { logger } from '../utils/logger';
import { createError, ErrorCode, handleError } from '../utils/error-handler';
import { getConfig } from '../config';

/**
 * Represents a scheduled task
 */
export class Task {
  /**
   * Unique identifier for the task
   */
  readonly id: string;

  /**
   * The function to execute
   */
  private readonly callback: TaskCallback;

  /**
   * The interval in milliseconds
   */
  private readonly interval: number;

  /**
   * Task configuration options
   */
  private readonly options: Required<TaskOptions>;

  /**
   * The timestamp of the last run
   */
  private lastRunTime: number | null;

  /**
   * The timestamp of the next scheduled run
   */
  private nextRunTime: number;

  /**
   * Whether the task is currently running
   */
  private _isRunning: boolean;

  /**
   * The current status of the task
   */
  private _status: TaskStatus;

  /**
   * The number of dependencies that need to be resolved
   */
  private _dependencyCount: number;

  /**
   * The timeout ID if the task has a timeout
   */
  private timeoutId: NodeJS.Timeout | null;

  /**
   * Task statistics
   */
  private statistics: TaskStatistics;

  /**
   * Task execution history
   */
  private executionHistory: TaskExecutionResult[];

  /**
   * Create a new task
   * @param callback - The function to execute
   * @param interval - The interval in milliseconds
   * @param options - Task configuration options
   */
  constructor(callback: TaskCallback, interval: number, options: TaskOptions = {}) {
    const config = getConfig();

    this.id = options.name ? `${options.name}_${uuidv4()}` : uuidv4();
    this.callback = callback;
    this.interval = interval;

    // Set default options
    this.options = {
      batch: options.batch || false,
      logger: options.logger || ((msg: string) => logger.info({ taskId: this.id }, msg)),
      weekdays: options.weekdays || [],
      timesOfDay: options.timesOfDay || [],
      dependencies: options.dependencies || [],
      timeout: options.timeout || config.defaultTaskTimeout,
      retryAttempts: options.retryAttempts !== undefined ? options.retryAttempts : config.defaultRetryAttempts,
      retryDelay: options.retryDelay || config.defaultRetryDelay,
      priority: options.priority || 0,
      cronExpression: options.cronExpression || '',
      name: options.name || callback.name || 'anonymous',
      description: options.description || '',
      tags: options.tags || [],
    };

    this.lastRunTime = null;
    this.nextRunTime = this.calculateNextRunTime();
    this._isRunning = false;
    this._status = TaskStatus.PENDING;
    this._dependencyCount = this.options.dependencies.length;
    this.timeoutId = null;

    this.statistics = {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      averageExecutionTime: 0,
      lastRunTime: null,
      lastRunStatus: null,
    };

    this.executionHistory = [];

    logger.debug(
      {
        taskId: this.id,
        name: this.options.name,
        interval: this.interval,
        nextRunTime: new Date(this.nextRunTime).toISOString(),
        options: {
          ...this.options,
          logger: options.logger ? 'custom' : 'default',
        },
      },
      `Task ${this.options.name} created`
    );
  }

  /**
   * Run the task
   * @returns A promise that resolves when the task completes
   */
  async run(): Promise<TaskExecutionResult> {
    const startTime = Date.now();
    this._isRunning = true;
    this._status = TaskStatus.RUNNING;

    // Set up timeout if specified
    if (this.options.timeout > 0) {
      this.timeoutId = setTimeout(() => {
        const error = createError(
          `Task ${this.options.name} timed out after ${this.options.timeout}ms`,
          ErrorCode.TASK_TIMEOUT,
          { taskId: this.id }
        );

        this._isRunning = false;
        this._status = TaskStatus.FAILED;

        handleError(error);
      }, this.options.timeout);
    }

    this.lastRunTime = startTime;
    this.calculateNextRunTime();

    this.options.logger(`Running task ${this.options.name}`);
    logger.debug({ taskId: this.id, name: this.options.name }, `Task ${this.options.name} started`);

    let result: TaskExecutionResult;

    try {
      await this.callback();

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Update statistics
      this.statistics.totalRuns++;
      this.statistics.successfulRuns++;
      this.statistics.averageExecutionTime =
        (this.statistics.averageExecutionTime * (this.statistics.totalRuns - 1) + executionTime) /
        this.statistics.totalRuns;
      this.statistics.lastRunTime = endTime;
      this.statistics.lastRunStatus = TaskStatus.COMPLETED;

      result = {
        taskId: this.id,
        status: TaskStatus.COMPLETED,
        startTime,
        endTime,
        executionTime,
      };

      // Add to history if enabled
      if (getConfig().persistTaskHistory) {
        this.addToHistory(result);
      }

      this._status = TaskStatus.COMPLETED;
      logger.debug(
        {
          taskId: this.id,
          name: this.options.name,
          executionTime,
        },
        `Task ${this.options.name} completed in ${executionTime}ms`
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      // Update statistics
      this.statistics.totalRuns++;
      this.statistics.failedRuns++;
      this.statistics.lastRunTime = Date.now();
      this.statistics.lastRunStatus = TaskStatus.FAILED;

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      result = {
        taskId: this.id,
        status: TaskStatus.FAILED,
        startTime,
        endTime,
        executionTime,
        error,
      };

      // Add to history if enabled
      if (getConfig().persistTaskHistory) {
        this.addToHistory(result);
      }

      this.options.logger(`Error running task ${this.options.name}: ${error.message}`);

      if (this.options.retryAttempts > 0) {
        this.options.logger(`Retrying task ${this.options.name} (${this.options.retryAttempts} attempts left)`);
        logger.debug(
          {
            taskId: this.id,
            name: this.options.name,
            error: error.message,
            retryAttempts: this.options.retryAttempts,
            retryDelay: this.options.retryDelay,
          },
          `Task ${this.options.name} failed, retrying in ${this.options.retryDelay}ms`
        );

        this.options.retryAttempts--;

        await new Promise((resolve) => setTimeout(resolve, this.options.retryDelay));
        return this.run();
      } else {
        this._status = TaskStatus.FAILED;

        handleError(
          createError(
            `Task ${this.options.name} failed after all retry attempts: ${error.message}`,
            ErrorCode.TASK_EXECUTION_FAILED,
            { taskId: this.id, originalError: error }
          )
        );
      }
    } finally {
      this._isRunning = false;

      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }
    }

    return result;
  }

  /**
   * Calculate the next run time for the task
   * @returns The timestamp of the next run
   */
  private calculateNextRunTime(): number {
    const now = new Date();

    // Handle cron expression if provided
    if (this.options.cronExpression) {
      try {
        const interval = CronExpressionParser.parse(this.options.cronExpression);
        const nextDate = interval.next().toDate();
        this.nextRunTime = nextDate.getTime();
        return this.nextRunTime;
      } catch (error) {
        handleError(
          createError(
            `Invalid cron expression: ${this.options.cronExpression}`,
            ErrorCode.INVALID_CRON_EXPRESSION,
            { taskId: this.id }
          )
        );
      }
    }

    // Handle specific times of day
    if (this.options.timesOfDay.length > 0) {
      for (const time of this.options.timesOfDay) {
        const [hour, minute] = time.split(':').map(Number);
        const nextTime = new Date(now);
        nextTime.setHours(hour, minute, 0, 0);

        if (now < nextTime) {
          this.nextRunTime = nextTime.getTime();
          return this.nextRunTime;
        }
      }

      // If all times for today have passed, schedule for tomorrow
      const [hour, minute] = this.options.timesOfDay[0].split(':').map(Number);
      const nextTime = new Date(now);
      nextTime.setDate(nextTime.getDate() + 1);
      nextTime.setHours(hour, minute, 0, 0);
      this.nextRunTime = nextTime.getTime();
      return this.nextRunTime;
    }

    // Handle weekdays
    if (this.options.weekdays.length > 0) {
      const currentDay = now.getDay();
      let daysToAdd = 1;

      // Find the next weekday that matches
      while (!this.options.weekdays.includes((currentDay + daysToAdd) % 7)) {
        daysToAdd++;
      }

      const nextDate = new Date(now);
      nextDate.setDate(nextDate.getDate() + daysToAdd);
      nextDate.setHours(0, 0, 0, 0);
      this.nextRunTime = nextDate.getTime();
      return this.nextRunTime;
    }

    // Default to simple interval
    this.nextRunTime = (this.lastRunTime || Date.now()) + this.interval;
    return this.nextRunTime;
  }

  /**
   * Check if the task is due to run
   * @returns True if the task is due to run, false otherwise
   */
  isDue(): boolean {
    return Date.now() >= this.nextRunTime;
  }

  /**
   * Add a task execution result to the history
   * @param result - The task execution result
   */
  private addToHistory(result: TaskExecutionResult): void {
    this.executionHistory.push(result);

    // Limit the history size
    const maxEntries = getConfig().maxTaskHistoryEntries;
    if (this.executionHistory.length > maxEntries) {
      this.executionHistory = this.executionHistory.slice(-maxEntries);
    }
  }

  /**
   * Get the task execution history
   * @returns The task execution history
   */
  getHistory(): TaskExecutionResult[] {
    return [...this.executionHistory];
  }

  /**
   * Get the task statistics
   * @returns The task statistics
   */
  getStatistics(): TaskStatistics {
    return { ...this.statistics };
  }

  /**
   * Get the task status
   * @returns The task status
   */
  get status(): TaskStatus {
    return this._status;
  }

  /**
   * Set the task status
   * @param status - The new status
   */
  set status(status: TaskStatus) {
    this._status = status;
  }

  /**
   * Get whether the task is running
   * @returns True if the task is running, false otherwise
   */
  get isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * Get the dependency count
   * @returns The number of dependencies that need to be resolved
   */
  get dependencyCount(): number {
    return this._dependencyCount;
  }

  /**
   * Set the dependency count
   * @param count - The new dependency count
   */
  set dependencyCount(count: number) {
    this._dependencyCount = count;
  }

  /**
   * Get the task name
   * @returns The task name
   */
  get name(): string {
    return this.options.name;
  }

  /**
   * Get the task priority
   * @returns The task priority
   */
  get priority(): number {
    return this.options.priority;
  }

  /**
   * Set the task priority
   * @param priority - The new priority
   */
  set priority(priority: number) {
    this.options.priority = priority;
  }

  /**
   * Get the task dependencies
   * @returns The task dependencies
   */
  get dependencies(): string[] {
    return [...this.options.dependencies];
  }
}