import cluster from 'cluster';
import os from 'os';
import { IClusterScheduler } from '../interfaces/cluster-scheduler.interface';
import { TaskCallback, TaskOptions } from '../interfaces/task.interface';
import { Scheduler } from './scheduler';
import { logger } from '../utils/logger';
import { createError, ErrorCode, handleError } from '../utils/error-handler';
import { v4 as uuidv4 } from 'uuid';
import EventEmitter from 'events';
import { Worker } from 'cluster';

/**
 * Interface for cluster messages
 */
interface ClusterMessage {
  type: string;
  [key: string]: unknown;
}

/**
 * Distributed task scheduler using Node.js clusters
 */
export class ClusterScheduler extends EventEmitter implements IClusterScheduler {
  /**
   * Number of worker processes
   */
  private numWorkers: number;

  /** 
   * Worker processes
   */
  private workers: Array<Worker>;

  /**
   * Local scheduler instance (for worker processes)
   */
  private scheduler: Scheduler | null;

  /**
   * Map of worker IDs to worker objects
   */
  private workerMap: Map<number, Worker>;

  /**
   * Create a new cluster scheduler
   * @param numWorkers - Number of worker processes (defaults to CPU count)
   */
  constructor(numWorkers?: number) {
    super();

    this.numWorkers = numWorkers || os.cpus().length;
    this.workers = [];
    this.scheduler = null;
    this.workerMap = new Map();

    logger.debug({ numWorkers: this.numWorkers }, 'ClusterScheduler initialized');

    // Set up message handlers
    if (cluster.isPrimary) {
      cluster.on('message', this.handleWorkerMessage.bind(this));
    }
  }

  /**
   * Start the cluster scheduler
   */
  start(): void {
    if (cluster.isPrimary) {
      logger.info({ numWorkers: this.numWorkers }, 'Starting ClusterScheduler in primary mode');

      // Fork worker processes
      for (let i = 0; i < this.numWorkers; i++) {
        this.addWorker();
      }

      // Handle worker exit
      cluster.on('exit', (worker, code, signal) => {
        logger.warn(
          {
            workerId: worker.id,
            pid: worker.process.pid,
            code,
            signal,
          },
          `Worker ${worker.id} (PID: ${worker.process.pid}) died with code ${code} and signal ${signal}`
        );

        // Replace the dead worker
        const newWorkerId = this.addWorker();
        const newWorker = this.workerMap.get(Number(newWorkerId));

        // Find and replace the dead worker in the workers array
        const index = this.workers.findIndex(w => w.id === worker.id);
        if (index !== -1 && newWorker) {
          this.workers[index] = newWorker;
        }

        // Emit event
        this.emit('workerDied', worker.id, code, signal);
        this.emit('workerAdded', newWorkerId);
      });

      // Emit event
      this.emit('started', this.numWorkers);
    } else {
      logger.info('Starting ClusterScheduler in worker mode');

      // Create a local scheduler for this worker
      this.scheduler = new Scheduler();

      // Listen for messages from the primary
      process.on('message', this.handlePrimaryMessage.bind(this));

      // Emit event
      this.emit('started', 0);
    }
  }

  /**
   * Stop the cluster scheduler
   */
  stop(): void {
    if (cluster.isPrimary) {
      logger.info('Stopping ClusterScheduler in primary mode');

      // Kill all workers
      for (const worker of this.workers) {
        worker.kill();
      }

      this.workers = [];
      this.workerMap.clear();

      // Emit event
      this.emit('stopped');
    } else if (this.scheduler) {
      logger.info('Stopping ClusterScheduler in worker mode');

      // Stop the local scheduler
      this.scheduler.stop();
      this.scheduler = null;

      // Emit event
      this.emit('stopped');
    }
  }

  /**
   * Schedule a task to run at a specified interval
   * @param callback - The function to execute
   * @param interval - The interval in milliseconds
   * @param options - Optional configuration for the task
   * @returns The ID of the scheduled task
   */
  scheduleTask(callback: TaskCallback, interval: number, options: TaskOptions = {}): string {
    if (cluster.isPrimary) {
      // Choose a worker to run the task
      const worker = this.getNextWorker();

      if (!worker) {
        throw createError(
          'No workers available to schedule task',
          ErrorCode.WORKER_NOT_FOUND
        );
      }

      const taskId = uuidv4();
      const callbackString = callback.toString();

      // Send message to worker
      worker.send({
        type: 'scheduleTask',
        taskId,
        callback: callbackString,
        interval,
        options,
      } as ClusterMessage);

      logger.debug(
        {
          taskId,
          workerId: worker.id,
          interval,
        },
        `Task scheduled on worker ${worker.id}`
      );

      // Emit event
      this.emit('taskScheduled', taskId, worker.id);

      return `${worker.id}:${taskId}`;
    } else if (this.scheduler) {
      return this.scheduler.scheduleTask(callback, interval, options);
    } else {
      throw createError(
        'Scheduler not initialized in worker',
        ErrorCode.INVALID_PARAMETER
      );
    }
  }

  /**
   * Cancel a scheduled task
   * @param taskId - The ID of the task to cancel
   * @returns True if the task was cancelled, false otherwise
   */
  cancelTask(taskId: string): boolean {
    if (cluster.isPrimary) {
      // Parse the combined ID to get worker ID and task ID
      const [workerIdStr, actualTaskId] = taskId.split(':');

      if (!workerIdStr || !actualTaskId) {
        logger.warn({ taskId }, 'Invalid task ID format for cancellation');
        return false;
      }

      const workerId = Number(workerIdStr);
      const worker = this.workerMap.get(workerId);

      if (!worker) {
        logger.warn({ workerId, taskId }, 'Worker not found for task cancellation');
        return false;
      }

      // Send message to worker
      worker.send({
        type: 'cancelTask',
        taskId: actualTaskId,
      } as ClusterMessage);

      logger.debug(
        {
          taskId: actualTaskId,
          workerId,
        },
        `Task cancellation requested on worker ${workerId}`
      );

      // Emit event
      this.emit('taskCancellationRequested', actualTaskId, workerId);

      return true;
    } else if (this.scheduler) {
      return this.scheduler.cancelTask(taskId);
    } else {
      logger.warn('Scheduler not initialized in worker for task cancellation');
      return false;
    }
  }

  /**
   * Set the maximum number of tasks that can run concurrently
   * @param max - The maximum number of concurrent tasks
   */
  setMaxConcurrency(max: number): void {
    if (cluster.isPrimary) {
      // Send message to all workers
      for (const worker of this.workers) {
        worker.send({
          type: 'setMaxConcurrency',
          max,
        } as ClusterMessage);
      }

      logger.debug(
        {
          maxConcurrency: max,
          numWorkers: this.workers.length,
        },
        `Max concurrency set to ${max} on all workers`
      );

      // Emit event
      this.emit('maxConcurrencyChanged', max);
    } else if (this.scheduler) {
      this.scheduler.setMaxConcurrency(max);
    } else {
      logger.warn('Scheduler not initialized in worker for setting max concurrency');
    }
  }

  /**
   * Get the IDs of all running tasks
   * @returns A promise that resolves to an object mapping worker IDs to arrays of task IDs
   */
  async getRunningTasks(): Promise<Record<string, string[]>> {
    if (cluster.isPrimary) {
      return new Promise((resolve) => {
        const results: Record<string, string[]> = {};
        let pendingWorkers = this.workers.length;
        
        // If no workers, return empty results immediately
        if (pendingWorkers === 0) {
          return resolve(results);
        }

        // Create a map of message handlers for each worker
        const messageHandlers = new Map<number, (msg: any) => void>();

        // Handle responses from workers
        const messageHandler = (worker: Worker, msg: any) => {
          if (msg.type === 'getRunningTasksResponse') {
            results[worker.id.toString()] = msg.tasks;
            pendingWorkers--;
            
            // Remove this specific worker's listener immediately
            worker.removeListener('message', messageHandlers.get(worker.id)!);
            messageHandlers.delete(worker.id);

            if (pendingWorkers === 0) {
              // All workers have responded, clear timeout
              if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
              }
              resolve(results);
            }
          }
        };

        // Send request to all workers
        for (const worker of this.workers) {
          const handler = (msg: any) => messageHandler(worker, msg);
          messageHandlers.set(worker.id, handler);
          worker.on('message', handler);

          worker.send({
            type: 'getRunningTasks',
          } as ClusterMessage);
        }

        // Handle timeout
        let timeoutId: NodeJS.Timeout | null = setTimeout(() => {
          if (pendingWorkers > 0) {
            logger.warn(
              {
                pendingWorkers,
                totalWorkers: this.workers.length,
              },
              'Timeout waiting for running tasks response from workers'
            );

            // Remove the remaining message handlers
            for (const [workerId, handler] of messageHandlers.entries()) {
              const worker = this.workerMap.get(workerId);
              if (worker) {
                worker.removeListener('message', handler);
              }
            }
            messageHandlers.clear();
            timeoutId = null;
            
            resolve(results);
          }
        }, 5000);
      });
    } else if (this.scheduler) {
      const tasks = this.scheduler.getRunningTasks();

      // Send response to primary
      if (process.send) {
        process.send({
          type: 'getRunningTasksResponse',
          tasks,
        } as ClusterMessage);
      }

      if (cluster.worker) {
        return { [cluster.worker.id.toString()]: tasks };
      }
      return { 'unknown': tasks };
    } else {
      logger.warn('Scheduler not initialized in worker for getting running tasks');
      return {};
    }
  }

  /**
   * Get the number of workers in the cluster
   * @returns The number of workers
   */
  getWorkerCount(): number {
    return this.workers.length;
  }

  /**
   * Add a worker to the cluster
   * @returns The ID of the new worker
   */
  addWorker(): string {
    if (!cluster.isPrimary) {
      throw createError(
        'Cannot add workers from a worker process',
        ErrorCode.INVALID_PARAMETER
      );
    }

    const worker = cluster.fork();
    this.workers.push(worker);
    this.workerMap.set(worker.id, worker);

    logger.debug(
      {
        workerId: worker.id,
        pid: worker.process.pid,
        totalWorkers: this.workers.length,
      },
      `Added worker ${worker.id} (PID: ${worker.process.pid})`
    );

    // Emit event
    this.emit('workerAdded', worker.id.toString());

    return worker.id.toString();
  }

  /**
   * Remove a worker from the cluster
   * @param workerId - The ID of the worker to remove
   * @returns True if the worker was removed, false otherwise
   */
  removeWorker(workerId: string): boolean {
    if (!cluster.isPrimary) {
      logger.warn('Cannot remove workers from a worker process');
      return false;
    }

    const workerIdNum = Number(workerId);
    if (isNaN(workerIdNum)) {
      logger.warn({ workerId }, 'Invalid worker ID for removal');
      return false;
    }

    const worker = this.workerMap.get(workerIdNum);

    if (!worker) {
      logger.warn({ workerId }, 'Worker not found for removal');
      return false;
    }

    // Remove the worker
    worker.kill();
    this.workerMap.delete(workerIdNum);
    this.workers = this.workers.filter(w => w.id !== workerIdNum);

    logger.debug(
      {
        workerId,
        remainingWorkers: this.workers.length,
      },
      `Removed worker ${workerId}`
    );

    // Emit event
    this.emit('workerRemoved', workerId);

    return true;
  }

  /**
   * Handle messages from a worker process
   * @param worker - The worker that sent the message
   * @param message - The message sent by the worker
   */
  private handleWorkerMessage(worker: Worker, message: any): void {
    if (!message || typeof message !== 'object' || !message.type) {
      return;
    }

    logger.debug(
      {
        workerId: worker.id,
        messageType: message.type,
      },
      `Received ${message.type} message from worker ${worker.id}`
    );

    switch (message.type) {
      case 'taskCompleted':
        this.emit('taskCompleted', message.taskId, worker.id);
        break;

      case 'taskFailed':
        this.emit('taskFailed', message.taskId, message.error, worker.id);
        break;

      case 'log':
        if (typeof message.level === 'string' &&
          typeof logger[message.level as keyof typeof logger] === 'function') {
          (logger[message.level as keyof typeof logger] as Function)(
            message.data,
            message.message
          );
        }
        break;

      default:
        // Forward other messages as events
        this.emit(`worker:${message.type}`, worker.id, message);
        break;
    }
  }

  /**
   * Handle messages from the primary process
   * @param message - The message sent by the primary
   */
  private handlePrimaryMessage(message: any): void {
    if (!message || typeof message !== 'object' || !message.type) {
      return;
    }

    logger.debug(
      {
        messageType: message.type,
      },
      `Received ${message.type} message from primary`
    );

    if (!this.scheduler) {
      logger.warn('Received message from primary but scheduler is not initialized');
      return;
    }

    switch (message.type) {
      case 'scheduleTask': {
        try {
          // Convert the callback string back to a function
          const callbackFunction = new Function(`return ${message.callback}`)() as TaskCallback;

          const taskId = this.scheduler.scheduleTask(
            callbackFunction,
            message.interval as number,
            message.options as TaskOptions
          );

          // Send acknowledgment to primary
          if (process.send) {
            process.send({
              type: 'taskScheduled',
              taskId,
              originalTaskId: message.taskId,
            } as ClusterMessage);
          }
        } catch (error) {
          logger.error(
            {
              error: (error as Error).message,
              task: message.taskId,
            },
            `Error scheduling task: ${(error as Error).message}`
          );

          // Send error to primary
          if (process.send) {
            process.send({
              type: 'taskSchedulingFailed',
              taskId: message.taskId,
              error: (error as Error).message,
            } as ClusterMessage);
          }
        }
        break;
      }

      case 'cancelTask':
        this.scheduler.cancelTask(message.taskId as string);
        break;

      case 'setMaxConcurrency':
        this.scheduler.setMaxConcurrency(message.max as number);
        break;

      case 'getRunningTasks':
        const runningTasks = this.scheduler.getRunningTasks();

        // Send response to primary
        if (process.send) {
          process.send({
            type: 'getRunningTasksResponse',
            tasks: runningTasks,
          } as ClusterMessage);
        }
        break;

      default:
        // Forward unknown messages as events
        this.emit(`primary:${message.type}`, message);
        break;
    }
  }

  /**
   * Get the next worker for task distribution
   * @returns The next worker to assign a task to
   */
  private getNextWorker(): Worker | null {
    if (this.workers.length === 0) {
      return null;
    }

    // Simple round-robin for now, but could be enhanced with load-based selection
    const worker = this.workers.shift()!;
    this.workers.push(worker);

    return worker;
  }
}