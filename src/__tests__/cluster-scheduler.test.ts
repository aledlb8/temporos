import { ClusterScheduler } from '../core/cluster-scheduler';
import { TaskStatus, TaskCallback } from '../interfaces/task.interface';
import * as cluster from 'cluster';
import { EventEmitter } from 'events';
import { Worker } from 'cluster';
import * as os from 'os';

interface MockWorker extends Omit<EventEmitter, 'listeners'> {
  id: number;
  process: { pid: number };
  send: jest.Mock;
  kill: jest.Mock;
  on: jest.Mock;
  removeListener: jest.Mock;
  listeners?: Record<string, Function[]>;
  simulateMessage(message: any): void;
}

// Mock the cluster module
jest.mock('cluster', () => {
  const EventEmitter = require('events');
  
  // Create a mock worker
  class MockWorker extends EventEmitter {
    id: number;
    process: { pid: number };
    send: jest.Mock;
    kill: jest.Mock;
    on: jest.Mock;
    removeListener: jest.Mock;
    listeners?: Record<string, Function[]>;
    
    constructor(id: number) {
      super();
      this.id = id;
      this.process = { pid: id + 10000 };
      this.send = jest.fn();
      this.kill = jest.fn();
      this.on = jest.fn().mockImplementation((event, handler) => {
        // Store the handler so we can call it directly in tests
        this.listeners = this.listeners || {};
        this.listeners[event] = this.listeners[event] || [];
        this.listeners[event].push(handler);
        return this;
      });
      this.removeListener = jest.fn().mockImplementation((event, handler) => {
        if (this.listeners && this.listeners[event]) {
          this.listeners[event] = this.listeners[event].filter(h => h !== handler);
        }
        return this;
      });
      this.listeners = {};
    }
    
    // Helper to simulate receiving a message
    simulateMessage(message: any) {
      if (this.listeners && this.listeners['message']) {
        this.listeners['message'].forEach(handler => handler(message));
      }
    }
  }
  
  // Create a mock cluster
  interface MockCluster {
    isPrimary: boolean;
    isWorker: boolean;
    fork: jest.Mock;
    workers: Record<number, MockWorker>;
    on: jest.Mock;
    once: jest.Mock;
    worker: { id: number };
    listeners: Record<string, Function[]>;
    removeAllListeners: jest.Mock;
    simulateEvent(event: string, ...args: any[]): void;
    _reset(): void;
    _setMode(isPrimary: boolean): void;
  }

  const clusterMock: MockCluster = {
    isPrimary: true,
    isWorker: false,
    fork: jest.fn(() => {
      const workerId = Math.floor(Math.random() * 1000) + 1;
      const worker = new MockWorker(workerId);
      clusterMock.workers[workerId] = worker;
      return worker;
    }),
    workers: {} as Record<number, MockWorker>,
    on: jest.fn().mockImplementation((event, handler) => {
      clusterMock.listeners = clusterMock.listeners || {};
      clusterMock.listeners[event] = clusterMock.listeners[event] || [];
      clusterMock.listeners[event].push(handler);
      return clusterMock;
    }),
    once: jest.fn(),
    worker: { id: 1 },
    listeners: {} as Record<string, Function[]>,
    removeAllListeners: jest.fn().mockImplementation(() => {
      clusterMock.listeners = {};
      return clusterMock;
    }),
    
    // Helper to simulate events
    simulateEvent(event: string, ...args: any[]) {
      if (clusterMock.listeners && clusterMock.listeners[event]) {
        clusterMock.listeners[event].forEach(handler => handler(...args));
      }
    },
    
    // Helper to reset the mock
    _reset: () => {
      clusterMock.isPrimary = true;
      clusterMock.isWorker = false;
      clusterMock.workers = {};
      clusterMock.listeners = {};
      jest.clearAllMocks();
    },
    
    // Helper to set primary/worker mode
    _setMode: (isPrimary: boolean) => {
      clusterMock.isPrimary = isPrimary;
      clusterMock.isWorker = !isPrimary;
    }
  };
  
  return clusterMock;
});

// Mock process.send
const originalProcessSend = process.send;
process.send = jest.fn();

// Mock the logger
jest.mock('../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('ClusterScheduler', () => {
  let scheduler: ClusterScheduler;
  
  beforeEach(() => {
    // Reset the cluster mock
    (cluster as any)._reset();
    
    // Create a new scheduler
    scheduler = new ClusterScheduler();
    
    // Override the stop method to ensure proper cleanup
    const originalStop = scheduler.stop;
    scheduler.stop = jest.fn().mockImplementation(() => {
      // Call the original stop method
      const result = originalStop.call(scheduler);
      
      // Ensure all event listeners are removed
      scheduler.removeAllListeners();
      
      return result;
    });
  });
  
  afterEach(() => {
    // Stop the scheduler and ensure all workers are terminated
    scheduler.stop();
    
    // Force terminate any remaining workers
    Object.values((cluster as any).workers).forEach((worker: any) => {
      if (worker && worker.kill) {
        worker.kill();
      }
    });
    
    // Clear all cluster event listeners
    if ((cluster as any).removeAllListeners) {
      (cluster as any).removeAllListeners();
    }
    
    // Clear all timers
    jest.clearAllTimers();
    
    // Clear all mocks
    jest.clearAllMocks();
    
    // Restore all mocks
    jest.restoreAllMocks();
  });
  
  describe('initialization', () => {
    test('should create a scheduler with default options', () => {
      expect(scheduler).toBeDefined();
      // Default is CPU count
      expect((scheduler as any).numWorkers).toBe(os.cpus().length);
    });
    
    test('should create a scheduler with custom concurrency', () => {
      const customConcurrency = 4;
      const customScheduler = new ClusterScheduler(customConcurrency);
      
      expect((customScheduler as any).numWorkers).toBe(customConcurrency);
    });
    
    test('should initialize in worker mode', () => {
      // Set cluster.isPrimary to false to simulate worker mode
      (cluster as any)._setMode(false);
      
      const workerScheduler = new ClusterScheduler();
      workerScheduler.start();
      
      // Verify scheduler was created in worker mode
      expect((workerScheduler as any).scheduler).not.toBeNull();
      
      // Cleanup
      workerScheduler.stop();
      
      // Reset to primary mode
      (cluster as any)._setMode(true);
    });
  });
  
  describe('worker management', () => {
    test('should start workers', () => {
      scheduler.start();
      
      // Should fork workers equal to CPU count
      expect((cluster as any).fork).toHaveBeenCalledTimes(os.cpus().length);
    });
    
    test('should add a worker', () => {
      const workerId = scheduler.addWorker();
      
      expect((cluster as any).fork).toHaveBeenCalledTimes(1);
      expect(typeof workerId).toBe('string');
    });
    
    test('should remove a worker', () => {
      // Add a worker first
      const workerId = scheduler.addWorker();
      
      // Then remove it
      scheduler.removeWorker(workerId);
      
      // Get the worker from the mock
      const worker = Object.values((cluster as any).workers)[0] as MockWorker;
      
      // Verify it was killed
      expect(worker.kill).toHaveBeenCalled();
    });
    
    test('should handle worker removal failures', () => {
      // Test with invalid worker ID
      const result1 = scheduler.removeWorker('invalid-id');
      expect(result1).toBe(false);
      
      // Test with non-existent worker ID
      const result2 = scheduler.removeWorker('999');
      expect(result2).toBe(false);
      
      // Test removing worker from worker mode
      (cluster as any)._setMode(false);
      const result3 = scheduler.removeWorker('1');
      expect(result3).toBe(false);
      (cluster as any)._setMode(true);
    });
    
    test('should handle worker exit and replace the worker', () => {
      // Start the scheduler
      scheduler.start();
      
      // Get a worker
      const worker = Object.values((cluster as any).workers)[0] as MockWorker;
      
      // Create a spy for the emit method
      const emitSpy = jest.spyOn(scheduler, 'emit');
      
      // Initial worker count before exit
      const initialWorkerCount = scheduler.getWorkerCount();
      
      // Simulate worker exit
      (cluster as any).simulateEvent('exit', worker, 1, 'SIGTERM');
      
      // Verify a new worker was added
      expect(scheduler.getWorkerCount()).toEqual(initialWorkerCount); // Count should remain the same
      expect(emitSpy).toHaveBeenCalledWith('workerDied', worker.id, 1, 'SIGTERM');
      expect(emitSpy).toHaveBeenCalledWith('workerAdded', expect.any(String));
    });
    
    test('should get worker count', () => {
      scheduler.start();
      
      expect(scheduler.getWorkerCount()).toBe(os.cpus().length);
    });
    
    test('should fail to add worker in worker mode', () => {
      (cluster as any)._setMode(false);
      
      expect(() => {
        scheduler.addWorker();
      }).toThrow();
      
      (cluster as any)._setMode(true);
    });
  });
  
  describe('task scheduling', () => {
    beforeEach(() => {
      // Use fake timers for all task scheduling tests
      jest.useFakeTimers({ legacyFakeTimers: true });
    });
    
    afterEach(() => {
      // Restore real timers
      jest.useRealTimers();
    });
    
    test('should schedule a task', () => {
      // Start the scheduler
      scheduler.start();
      
      // Schedule a task
      const taskId = scheduler.scheduleTask(() => {
        // Just a void function for testing
      }, 1000);
      
      // Fast-forward timers
      jest.runAllTimers();
      
      expect(taskId).toBeDefined();
      expect(taskId.includes(':')).toBe(true);
    });
    
    test('should schedule a task in worker mode', () => {
      // Set up worker mode
      (cluster as any)._setMode(false);
      Object.defineProperty(cluster, 'worker', { 
        get: () => ({ id: 42 }),
        configurable: true
      });
      
      const workerScheduler = new ClusterScheduler();
      workerScheduler.start();
      
      // Schedule a task
      const taskId = workerScheduler.scheduleTask(() => {
        // Just a void function for testing
      }, 1000);
      
      expect(taskId).toBeDefined();
      
      // Cleanup
      workerScheduler.stop();
      
      // Restore primary mode
      (cluster as any)._setMode(true);
    });
    
    test('should throw when scheduling a task with no workers', () => {
      // Start the scheduler but remove all workers
      scheduler.start();
      (scheduler as any).workers = [];
      
      expect(() => {
        scheduler.scheduleTask(() => {}, 1000);
      }).toThrow();
    });
    
    test('should throw when scheduling a task in worker mode with no scheduler', () => {
      // Set up worker mode but don't initialize scheduler
      (cluster as any)._setMode(false);
      
      const workerScheduler = new ClusterScheduler();
      // Don't call start() to keep scheduler null
      
      expect(() => {
        workerScheduler.scheduleTask(() => {}, 1000);
      }).toThrow();
      
      // Restore primary mode
      (cluster as any)._setMode(true);
    });
    
    test('should cancel a task', () => {
      // Start the scheduler
      scheduler.start();
      
      // Schedule a task
      const taskId = scheduler.scheduleTask(() => {
        // Just a void function for testing
      }, 1000);
      
      // Cancel the task
      const result = scheduler.cancelTask(taskId);
      
      // Fast-forward timers
      jest.runAllTimers();
      
      expect(result).toBe(true);
    });
    
    test('should handle invalid task cancellation', () => {
      // Start the scheduler
      scheduler.start();
      
      // Test with invalid task ID format
      const result1 = scheduler.cancelTask('invalid-task-id');
      expect(result1).toBe(false);
      
      // Test with non-existent worker ID
      const result2 = scheduler.cancelTask('999:task-id');
      expect(result2).toBe(false);
      
      // Test cancelling task in worker mode with no scheduler
      (cluster as any)._setMode(false);
      
      const workerScheduler = new ClusterScheduler();
      // Don't call start() to keep scheduler null
      
      const result3 = workerScheduler.cancelTask('task-id');
      expect(result3).toBe(false);
      
      // Restore primary mode
      (cluster as any)._setMode(true);
    });
    
    test('should cancel a task in worker mode', () => {
      // Set up worker mode
      (cluster as any)._setMode(false);
      
      const workerScheduler = new ClusterScheduler();
      workerScheduler.start();
      
      // Mock the cancel method of the internal scheduler
      (workerScheduler as any).scheduler.cancelTask = jest.fn().mockReturnValue(true);
      
      // Cancel a task
      const result = workerScheduler.cancelTask('task-id');
      
      expect(result).toBe(true);
      expect((workerScheduler as any).scheduler.cancelTask).toHaveBeenCalledWith('task-id');
      
      // Cleanup
      workerScheduler.stop();
      
      // Restore primary mode
      (cluster as any)._setMode(true);
    });
    
    test('should get running tasks', async () => {
      // Start the scheduler
      scheduler.start();
      
      // Add a worker
      const workerId = scheduler.addWorker();
      const worker = Object.values((cluster as any).workers)[0] as MockWorker;
      
      // Create a mock response
      const mockTasks = ['task1', 'task2'];
      
      // Create a promise for the getRunningTasks call
      const tasksPromise = scheduler.getRunningTasks();
      
      // Simulate worker response
      worker.simulateMessage({
        type: 'getRunningTasksResponse',
        tasks: mockTasks
      });
      
      // Fast-forward timers
      jest.runAllTimers();
      
      // Wait for the promise to resolve
      const tasks = await tasksPromise;
      
      // Verify the result
      expect(tasks).toHaveProperty(worker.id.toString());
      expect(tasks[worker.id.toString()]).toEqual(mockTasks);
    });
    
    test('should handle timeout when getting running tasks', async () => {
      // Start the scheduler
      scheduler.start();
      
      // Create a promise for the getRunningTasks call
      const tasksPromise = scheduler.getRunningTasks();
      
      // Fast-forward timers to trigger timeout
      jest.advanceTimersByTime(6000);
      
      // Wait for the promise to resolve
      const tasks = await tasksPromise;
      
      // Verify an empty result was returned
      expect(Object.keys(tasks).length).toBe(0);
    });
    
    test('should get running tasks in worker mode', async () => {
      // Set up worker mode
      (cluster as any)._setMode(false);
      (cluster as any).worker = { id: 42 };
      
      const workerScheduler = new ClusterScheduler();
      workerScheduler.start();
      
      // Mock the getRunningTasks method of the internal scheduler
      const mockTasks = ['task1', 'task2'];
      (workerScheduler as any).scheduler.getRunningTasks = jest.fn().mockReturnValue(mockTasks);
      
      // Get running tasks
      const tasks = await workerScheduler.getRunningTasks();
      
      // Verify the result
      expect(tasks).toHaveProperty('42');
      expect(tasks['42']).toEqual(mockTasks);
      expect(process.send).toHaveBeenCalledWith({
        type: 'getRunningTasksResponse',
        tasks: mockTasks
      });
      
      // Cleanup
      workerScheduler.stop();
      
      // Restore primary mode
      (cluster as any)._setMode(true);
      (cluster as any).worker = { id: 1 };
    });
    
    test('should handle getting running tasks in worker mode with no scheduler', async () => {
      // Set up worker mode but don't initialize scheduler
      (cluster as any)._setMode(false);
      
      const workerScheduler = new ClusterScheduler();
      // Don't call start() to keep scheduler null
      
      // Get running tasks
      const tasks = await workerScheduler.getRunningTasks();
      
      // Verify empty result
      expect(Object.keys(tasks).length).toBe(0);
      
      // Restore primary mode
      (cluster as any)._setMode(true);
    });
    
    test('should get running tasks when no workers are available', async () => {
      // Start the scheduler but remove all workers
      scheduler.start();
      (scheduler as any).workers = [];
      
      // Get running tasks
      const tasks = await scheduler.getRunningTasks();
      
      // Verify empty result
      expect(Object.keys(tasks).length).toBe(0);
    });
  });
  
  describe('worker communication', () => {
    beforeEach(() => {
      // Use fake timers for all worker communication tests
      jest.useFakeTimers({ legacyFakeTimers: true });
    });
    
    afterEach(() => {
      // Restore real timers
      jest.useRealTimers();
    });
    
    test('should set max concurrency', () => {
      // Start the scheduler
      scheduler.start();
      
      // Set max concurrency
      scheduler.setMaxConcurrency(5);
      
      // Fast-forward timers
      jest.runAllTimers();
      
      // Verify message was sent to workers
      Object.values((cluster as any).workers).forEach((worker: any) => {
        expect((worker as MockWorker).send).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'setMaxConcurrency',
            max: 5
          })
        );
      });
    });
    
    test('should set max concurrency in worker mode', () => {
      // Set up worker mode
      (cluster as any)._setMode(false);
      
      const workerScheduler = new ClusterScheduler();
      workerScheduler.start();
      
      // Mock the setMaxConcurrency method of the internal scheduler
      (workerScheduler as any).scheduler.setMaxConcurrency = jest.fn();
      
      // Set max concurrency
      workerScheduler.setMaxConcurrency(5);
      
      // Verify the internal scheduler's method was called
      expect((workerScheduler as any).scheduler.setMaxConcurrency).toHaveBeenCalledWith(5);
      
      // Cleanup
      workerScheduler.stop();
      
      // Restore primary mode
      (cluster as any)._setMode(true);
    });
    
    test('should handle setting max concurrency in worker mode with no scheduler', () => {
      // Set up worker mode but don't initialize scheduler
      (cluster as any)._setMode(false);
      
      const workerScheduler = new ClusterScheduler();
      // Don't call start() to keep scheduler null
      
      // Set max concurrency (should not throw)
      expect(() => {
        workerScheduler.setMaxConcurrency(5);
      }).not.toThrow();
      
      // Restore primary mode
      (cluster as any)._setMode(true);
    });
    
    test('should handle worker messages', () => {
      // Start the scheduler
      scheduler.start();
      
      // Create a spy for the emit method
      const emitSpy = jest.spyOn(scheduler, 'emit');
      
      // Find the message handler from the cluster.on mock calls
      const messageHandlerCalls = (cluster as any).on.mock.calls.filter(
        ([event]: [string]) => event === 'message'
      );
      
      if (messageHandlerCalls.length > 0) {
        const messageHandler = messageHandlerCalls[0][1];
        const worker = Object.values((cluster as any).workers)[0] as MockWorker;
        
        // Test taskCompleted message
        messageHandler(worker, { type: 'taskCompleted', taskId: 'test-task' });
        expect(emitSpy).toHaveBeenCalledWith('taskCompleted', 'test-task', worker.id);
        
        // Test taskFailed message
        messageHandler(worker, { type: 'taskFailed', taskId: 'test-task', error: 'Test error' });
        expect(emitSpy).toHaveBeenCalledWith('taskFailed', 'test-task', 'Test error', worker.id);
        
        // Test log message
        messageHandler(worker, { type: 'log', level: 'info', data: { test: true }, message: 'Test log' });
        
        // Test unknown message type
        messageHandler(worker, { type: 'customEvent', data: 'test-data' });
        expect(emitSpy).toHaveBeenCalledWith('worker:customEvent', worker.id, expect.objectContaining({ data: 'test-data' }));
        
        // Test invalid message (no type)
        messageHandler(worker, { data: 'test-data' });
        // Should not throw and not emit any event
        
        // Fast-forward timers
        jest.runAllTimers();
      } else {
        // If no message handler was found, fail the test
        fail('No message handler was registered');
      }
    });
    
    test('should handle primary messages in worker mode', () => {
      // Set up worker mode
      (cluster as any)._setMode(false);
      
      const workerScheduler = new ClusterScheduler();
      workerScheduler.start();
      
      // Create a spy for the emit method
      const emitSpy = jest.spyOn(workerScheduler, 'emit');
      
      // Mock process.on to capture the message handler
      const originalProcessOn = process.on;
      let messageHandler: ((message: any) => void) | null = null;
      process.on = jest.fn().mockImplementation((event: string, handler: Function) => {
        if (event === 'message') {
          messageHandler = handler as (message: any) => void;
        }
        return process;
      });
      
      // Start the scheduler to register the message handler
      workerScheduler.start();
      
      // Verify a message handler was registered
      expect(messageHandler).not.toBeNull();
      
      if (messageHandler) {
        const typedHandler = messageHandler as (msg: any) => void;
        
        // Mock the scheduler methods
        (workerScheduler as any).scheduler.scheduleTask = jest.fn().mockReturnValue('task-id');
        (workerScheduler as any).scheduler.cancelTask = jest.fn();
        (workerScheduler as any).scheduler.setMaxConcurrency = jest.fn();
        (workerScheduler as any).scheduler.getRunningTasks = jest.fn().mockReturnValue(['task1', 'task2']);
        
        // Test scheduleTask message
        typedHandler({
          type: 'scheduleTask',
          taskId: 'original-task-id',
          callback: '() => console.log("test")',
          interval: 1000,
          options: { name: 'test-task' }
        });
        
        // Test cancelTask message
        typedHandler({
          type: 'cancelTask',
          taskId: 'task-id'
        });
        
        // Test setMaxConcurrency message
        typedHandler({
          type: 'setMaxConcurrency',
          max: 5
        });
        
        // Test getRunningTasks message
        typedHandler({
          type: 'getRunningTasks'
        });
        
        // Test unknown message type
        typedHandler({
          type: 'customEvent',
          data: 'test-data'
        });
        
        // Test invalid message (no type)
        typedHandler({
          data: 'test-data'
        });
      }
      
      // Restore process.on
      process.on = originalProcessOn;
      
      // Cleanup
      workerScheduler.stop();
      
      // Restore primary mode
      (cluster as any)._setMode(true);
    });
    
    test('should handle primary messages in worker mode with no scheduler', () => {
      // Set up worker mode
      (cluster as any)._setMode(false);
      
      const workerScheduler = new ClusterScheduler();
      // Don't start to keep scheduler null
      
      // Mock process.on to capture the message handler
      const originalProcessOn = process.on;
      let messageHandler: ((message: any) => void) | null = null;
      process.on = jest.fn().mockImplementation((event: string, handler: Function) => {
        if (event === 'message') {
          messageHandler = handler as (message: any) => void;
        }
        return process;
      });
      
      // Manually call handlePrimaryMessage
      (workerScheduler as any).handlePrimaryMessage({
        type: 'getRunningTasks'
      });
      
      // Restore process.on
      process.on = originalProcessOn;
      
      // Restore primary mode
      (cluster as any)._setMode(true);
    });
    
    test('should handle task scheduling errors in worker mode', () => {
      // Set up worker mode
      (cluster as any)._setMode(false);
      
      const workerScheduler = new ClusterScheduler();
      workerScheduler.start();
      
      // Mock the scheduler to throw an error
      (workerScheduler as any).scheduler.scheduleTask = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      
      // Mock process.on to capture the message handler
      const originalProcessOn = process.on;
      let messageHandler: ((message: any) => void) | null = null;
      process.on = jest.fn().mockImplementation((event: string, handler: Function) => {
        if (event === 'message') {
          messageHandler = handler as (message: any) => void;
        }
        return process;
      });
      
      // Start the scheduler to register the message handler
      workerScheduler.start();
      
      // Verify a message handler was registered
      expect(messageHandler).not.toBeNull();
      
      if (messageHandler) {
        // Test scheduleTask message that will throw
        const typedHandler = messageHandler as (msg: any) => void;
        typedHandler({
          type: 'scheduleTask',
          taskId: 'original-task-id',
          callback: '() => console.log("test")',
          interval: 1000,
          options: { name: 'test-task' }
        });
        
        // Verify error message was sent
        expect(process.send).toHaveBeenCalledWith({
          type: 'taskSchedulingFailed',
          taskId: 'original-task-id',
          error: 'Test error'
        });
      }
      
      // Restore process.on
      process.on = originalProcessOn;
      
      // Cleanup
      workerScheduler.stop();
      
      // Restore primary mode
      (cluster as any)._setMode(true);
    });
  });
}); 