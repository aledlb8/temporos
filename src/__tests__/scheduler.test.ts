import { Scheduler } from '../core/scheduler';
import { TaskStatus } from '../interfaces/task.interface';

describe('Scheduler', () => {
  let scheduler: Scheduler;
  
  beforeEach(() => {
    scheduler = new Scheduler();
  });
  
  afterEach(() => {
    scheduler.stop();
  });
  
  test('should schedule a task', () => {
    const taskId = scheduler.scheduleTask(() => {
      // Do nothing
    }, 1000);
    
    expect(taskId).toBeDefined();
    expect(typeof taskId).toBe('string');
  });
  
  test('should cancel a task', () => {
    const taskId = scheduler.scheduleTask(() => {
      // Do nothing
    }, 1000);
    
    const result = scheduler.cancelTask(taskId);
    
    expect(result).toBe(true);
  });
  
  test('should return false when cancelling a non-existent task', () => {
    const result = scheduler.cancelTask('non-existent-task');
    
    expect(result).toBe(false);
  });
  
  test('should prioritize a task', () => {
    const taskId = scheduler.scheduleTask(() => {
      // Do nothing
    }, 1000);
    
    const result = scheduler.prioritizeTask(taskId, 10);
    
    expect(result).toBe(true);
  });
  
  test('should return running tasks', () => {
    const tasks = scheduler.getRunningTasks();
    
    expect(Array.isArray(tasks)).toBe(true);
  });
  
  test('should pause a task', () => {
    const taskId = scheduler.scheduleTask(() => {
      // Do nothing
    }, 1000);
    
    const result = scheduler.pauseTask(taskId);
    
    expect(result).toBe(true);
  });
  
  test('should resume a paused task', () => {
    const taskId = scheduler.scheduleTask(() => {
      // Do nothing
    }, 1000);
    
    scheduler.pauseTask(taskId);
    const result = scheduler.resumeTask(taskId);
    
    expect(result).toBe(true);
  });
  
  test('should run a task immediately', async () => {
    let taskRan = false;
    
    const taskId = scheduler.scheduleTask(() => {
      taskRan = true;
    }, 0);
    
    // Give the task time to run
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    expect(taskRan).toBe(true);
  });
  
  test('should handle task dependencies', async () => {
    let task1Ran = false;
    let task2Ran = false;
    
    const task1Id = scheduler.scheduleTask(() => {
      task1Ran = true;
    }, 0);
    
    const task2Id = scheduler.scheduleTask(() => {
      task2Ran = true;
      expect(task1Ran).toBe(true); // Task 1 should have run before Task 2
    }, 0, { dependencies: [task1Id] });
    
    // Give the tasks time to run
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    expect(task1Ran).toBe(true);
    expect(task2Ran).toBe(true);
  });
  
  test('should get task statistics', async () => {
    const taskId = scheduler.scheduleTask(() => {
      // Do nothing
    }, 0);
    
    // Give the task time to run
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    const stats = await scheduler.getTaskStatistics(taskId);
    
    expect(Array.isArray(stats)).toBe(true);
  });
  
  test('should set max concurrency', () => {
    scheduler.setMaxConcurrency(5);
    
    // Implementation specific test - we don't have a getter for maxConcurrency
    expect(() => scheduler.setMaxConcurrency(5)).not.toThrow();
  });
  
  test('should schedule a cron task', () => {
    const taskId = scheduler.scheduleCronTask(() => {
      // Do nothing
    }, '*/5 * * * *');
    
    expect(taskId).toBeDefined();
    expect(typeof taskId).toBe('string');
  });
}); 