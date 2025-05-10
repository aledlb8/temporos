import { Task } from './task';
import { IScheduler } from '../interfaces/scheduler.interface';
import { TaskCallback, TaskOptions, TaskExecutionResult, TaskStatus } from '../interfaces/task.interface';
import { logger } from '../utils/logger';
import { createError, ErrorCode, handleError } from '../utils/error-handler';
import { getConfig } from '../config';
import EventEmitter from 'events';

/**
 * Task scheduler for managing and executing tasks
 */
export class Scheduler extends EventEmitter implements IScheduler {
  /**
   * Map of task IDs to tasks
   */
  private tasks: Map<string, Task>;

  /**
   * Maximum number of tasks that can run concurrently
   */
  private maxConcurrency: number;

  /**
   * Set of currently running task IDs
   */
  private runningTasks: Set<string>;

  /**
   * Priority queue for tasks
   */
  private priorityQueue: { taskId: string; priority: number }[];

  /**
   * Interval ID for the task checker
   */
  private checkInterval: NodeJS.Timeout | null;

  /**
   * Create a new scheduler
   */
  constructor() {
    super();
    
    this.tasks = new Map();
    this.maxConcurrency = getConfig().defaultMaxConcurrency;
    this.runningTasks = new Set();
    this.priorityQueue = [];
    this.checkInterval = null;
    
    // Start the task checker
    this.start();
    
    logger.debug('Scheduler initialized');
  }

  /**
   * Schedule a task to run at a specified interval
   * @param callback - The function to execute
   * @param interval - The interval in milliseconds
   * @param options - Optional configuration for the task
   * @returns The ID of the scheduled task
   */
  scheduleTask(callback: TaskCallback, interval: number, options: TaskOptions = {}): string {
    if (typeof callback !== 'function') {
      throw createError(
        'Callback must be a function',
        ErrorCode.INVALID_PARAMETER,
        { callback }
      );
    }

    if (typeof interval !== 'number' || interval < 0) {
      throw createError(
        'Interval must be a non-negative number',
        ErrorCode.INVALID_PARAMETER,
        { interval }
      );
    }
    
    const task = new Task(callback, interval, options);
    this.tasks.set(task.id, task);
    
    logger.debug(
      { 
        taskId: task.id, 
        name: task.name,
        interval,
      }, 
      `Task ${task.name} scheduled`
    );
    
    // Emit event
    this.emit('taskScheduled', task.id);
    
    // If the task should run immediately, schedule it
    if (interval === 0) {
      setImmediate(() => this.runTask(task.id));
    }
    
    return task.id;
  }

  /**
   * Schedule a task using a cron expression
   * @param callback - The function to execute
   * @param cronExpression - The cron expression
   * @param options - Optional configuration for the task
   * @returns The ID of the scheduled task
   */
  scheduleCronTask(callback: TaskCallback, cronExpression: string, options: TaskOptions = {}): string {
    if (typeof callback !== 'function') {
      throw createError(
        'Callback must be a function',
        ErrorCode.INVALID_PARAMETER,
        { callback }
      );
    }

    if (typeof cronExpression !== 'string' || !cronExpression) {
      throw createError(
        'Cron expression must be a non-empty string',
        ErrorCode.INVALID_PARAMETER,
        { cronExpression }
      );
    }
    
    const taskOptions: TaskOptions = {
      ...options,
      cronExpression,
    };
    
    // Schedule with interval 0, the actual timing will be handled by the cron expression
    const task = new Task(callback, 0, taskOptions);
    this.tasks.set(task.id, task);
    
    logger.debug(
      { 
        taskId: task.id, 
        name: task.name,
        cronExpression,
      }, 
      `Task ${task.name} scheduled with cron expression ${cronExpression}`
    );
    
    // Emit event
    this.emit('taskScheduled', task.id);
    
    return task.id;
  }

  /**
   * Cancel a scheduled task
   * @param taskId - The ID of the task to cancel
   * @returns True if the task was cancelled, false otherwise
   */
  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      logger.debug({ taskId }, `Task ${taskId} not found for cancellation`);
      return false;
    }
    
    // Remove from priority queue if present
    this.priorityQueue = this.priorityQueue.filter(item => item.taskId !== taskId);
    
    // Remove from running tasks if present
    this.runningTasks.delete(taskId);
    
    // Remove from tasks map
    this.tasks.delete(taskId);
    
    // Update task status
    task.status = TaskStatus.CANCELLED;
    
    logger.debug({ taskId, name: task.name }, `Task ${task.name} cancelled`);
    
    // Emit event
    this.emit('taskCancelled', taskId);
    
    return true;
  }

  /**
   * Set the maximum number of tasks that can run concurrently
   * @param max - The maximum number of concurrent tasks
   */
  setMaxConcurrency(max: number): void {
    if (typeof max !== 'number' || max <= 0) {
      throw createError(
        'Max concurrency must be a positive number',
        ErrorCode.INVALID_PARAMETER,
        { max }
      );
    }
    
    this.maxConcurrency = max;
    
    logger.debug({ maxConcurrency: max }, `Max concurrency set to ${max}`);
    
    // Emit event
    this.emit('maxConcurrencyChanged', max);
    
    // Try to run tasks that might be waiting due to concurrency limits
    this.checkTasks();
  }

  /**
   * Prioritize a task
   * @param taskId - The ID of the task to prioritize
   * @param priority - The priority level (higher = more important)
   * @returns True if the task was prioritized, false otherwise
   */
  prioritizeTask(taskId: string, priority: number): boolean {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      logger.debug({ taskId }, `Task ${taskId} not found for prioritization`);
      return false;
    }
    
    // Update task priority
    task.priority = priority;
    
    // Update priority queue
    const existingIndex = this.priorityQueue.findIndex(item => item.taskId === taskId);
    
    if (existingIndex !== -1) {
      this.priorityQueue[existingIndex].priority = priority;
    } else {
      this.priorityQueue.push({ taskId, priority });
    }
    
    // Sort by priority (descending)
    this.priorityQueue.sort((a, b) => b.priority - a.priority);
    
    logger.debug(
      { 
        taskId, 
        name: task.name,
        priority,
      }, 
      `Task ${task.name} priority set to ${priority}`
    );
    
    // Emit event
    this.emit('taskPrioritized', taskId, priority);
    
    return true;
  }

  /**
   * Get the IDs of all running tasks
   * @returns An array of task IDs
   */
  getRunningTasks(): string[] {
    return Array.from(this.runningTasks);
  }

  /**
   * Pause a task
   * @param taskId - The ID of the task to pause
   * @returns True if the task was paused, false otherwise
   */
  pauseTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      logger.debug({ taskId }, `Task ${taskId} not found for pausing`);
      return false;
    }
    
    if (task.status === TaskStatus.PAUSED) {
      logger.debug({ taskId, name: task.name }, `Task ${task.name} is already paused`);
      return true;
    }
    
    // Update task status
    task.status = TaskStatus.PAUSED;
    
    logger.debug({ taskId, name: task.name }, `Task ${task.name} paused`);
    
    // Emit event
    this.emit('taskPaused', taskId);
    
    return true;
  }

  /**
   * Resume a paused task
   * @param taskId - The ID of the task to resume
   * @returns True if the task was resumed, false otherwise
   */
  resumeTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      logger.debug({ taskId }, `Task ${taskId} not found for resuming`);
      return false;
    }
    
    if (task.status !== TaskStatus.PAUSED) {
      logger.debug({ taskId, name: task.name }, `Task ${task.name} is not paused`);
      return false;
    }
    
    // Update task status
    task.status = TaskStatus.PENDING;
    
    logger.debug({ taskId, name: task.name }, `Task ${task.name} resumed`);
    
    // Emit event
    this.emit('taskResumed', taskId);
    
    // Check if the task can be run now
    this.checkTasks();
    
    return true;
  }

  /**
   * Get statistics for a task
   * @param taskId - The ID of the task
   * @returns The task statistics or null if the task doesn't exist
   */
  async getTaskStatistics(taskId: string): Promise<TaskExecutionResult[]> {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      logger.debug({ taskId }, `Task ${taskId} not found for getting statistics`);
      return [];
    }
    
    return task.getHistory();
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.checkInterval) {
      return;
    }
    
    const interval = getConfig().defaultCheckInterval;
    
    this.checkInterval = setInterval(() => {
      this.checkTasks();
    }, interval);
    
    logger.debug({ checkInterval: interval }, 'Scheduler started');
    
    // Emit event
    this.emit('started');
  }

  /**
   * Stop the scheduler and cancel all tasks
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    // Cancel all tasks
    for (const taskId of this.tasks.keys()) {
      this.cancelTask(taskId);
    }
    
    logger.debug('Scheduler stopped');
    
    // Emit event
    this.emit('stopped');
  }

  /**
   * Check for tasks that are due to run
   */
  private checkTasks(): void {
    // First, check priority queue
    if (this.priorityQueue.length > 0 && this.runningTasks.size < this.maxConcurrency) {
      const { taskId } = this.priorityQueue.shift()!;
      const task = this.tasks.get(taskId);
      
      if (task && !task.isRunning && task.status !== TaskStatus.PAUSED) {
        this.runTask(taskId);
      }
    }
    
    // Then check regular tasks
    const tasksToRun = Array.from(this.tasks.entries())
      .filter(([_, task]) => 
        task.isDue() && 
        !task.isRunning && 
        task.dependencyCount === 0 && 
        task.status !== TaskStatus.PAUSED
      )
      .sort(([_, a], [__, b]) => b.priority - a.priority);
    
    for (const [taskId] of tasksToRun) {
      if (this.runningTasks.size < this.maxConcurrency) {
        this.runTask(taskId);
      } else {
        break;
      }
    }
  }

  /**
   * Run a specific task
   * @param taskId - The ID of the task to run
   */
  private async runTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      logger.debug({ taskId }, `Task ${taskId} not found for execution`);
      return;
    }
    
    if (task.isRunning) {
      logger.debug({ taskId, name: task.name }, `Task ${task.name} is already running`);
      return;
    }
    
    if (task.status === TaskStatus.PAUSED) {
      logger.debug({ taskId, name: task.name }, `Task ${task.name} is paused`);
      return;
    }
    
    if (task.dependencyCount > 0) {
      logger.debug(
        { 
          taskId, 
          name: task.name,
          dependencyCount: task.dependencyCount,
        }, 
        `Task ${task.name} has unresolved dependencies`
      );
      return;
    }
    
    if (this.runningTasks.size >= this.maxConcurrency) {
      logger.debug(
        { 
          taskId, 
          name: task.name,
          runningTasks: this.runningTasks.size,
          maxConcurrency: this.maxConcurrency,
        }, 
        `Cannot run task ${task.name} due to concurrency limits`
      );
      return;
    }
    
    // Add to running tasks
    this.runningTasks.add(taskId);
    
    // Emit event
    this.emit('taskStarted', taskId);
    
    try {
      const result = await task.run();
      
      // Emit event
      this.emit('taskCompleted', taskId, result);
      
      // Check dependencies
      this.checkDependencies(taskId);
      
      // If it's a batch task, don't remove it
      if (task.isDue() && this.tasks.has(taskId)) {
        // Schedule the task to run again if it's still in the tasks map
        setImmediate(() => this.checkTasks());
      }
    } catch (error) {
      // Emit event
      this.emit('taskFailed', taskId, error);
      
      handleError(error as Error, false, { taskId, name: task.name });
    } finally {
      // Remove from running tasks
      this.runningTasks.delete(taskId);
      
      // Check for more tasks to run
      setImmediate(() => this.checkTasks());
    }
  }

  /**
   * Check and update dependencies when a task completes
   * @param completedTaskId - The ID of the completed task
   */
  private checkDependencies(completedTaskId: string): void {
    for (const [taskId, task] of this.tasks.entries()) {
      if (task.dependencies.includes(completedTaskId) && task.dependencyCount > 0) {
        task.dependencyCount--;
        
        logger.debug(
          { 
            taskId, 
            name: task.name,
            dependencyCount: task.dependencyCount,
            completedDependency: completedTaskId,
          }, 
          `Dependency ${completedTaskId} completed for task ${task.name}`
        );
        
        if (task.dependencyCount === 0) {
          logger.debug(
            { 
              taskId, 
              name: task.name,
            }, 
            `All dependencies resolved for task ${task.name}`
          );
          
          // Emit event
          this.emit('taskDependenciesResolved', taskId);
          
          // Try to run the task if all dependencies are resolved
          setImmediate(() => this.checkTasks());
        }
      }
    }
  }
} 