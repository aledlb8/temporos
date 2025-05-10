import { TaskStatus } from '../interfaces/task.interface';

// Mock implementations
const mockScheduleTask = jest.fn().mockReturnValue('task-id');
const mockScheduleCronTask = jest.fn().mockReturnValue('cron-task-id');
const mockCancelTask = jest.fn().mockReturnValue(true);
const mockSetMaxConcurrency = jest.fn();
const mockPrioritizeTask = jest.fn().mockReturnValue(true);
const mockGetRunningTasks = jest.fn().mockReturnValue(['task-1', 'task-2']);
const mockPauseTask = jest.fn().mockReturnValue(true);
const mockResumeTask = jest.fn().mockReturnValue(true);
const mockGetTaskStatistics = jest.fn().mockResolvedValue([{
  taskId: 'task-id',
  startTime: Date.now(),
  endTime: Date.now() + 100,
  executionTime: 100,
  status: TaskStatus.COMPLETED
}]);

// Use doMock instead of mock to avoid hoisting issues
jest.doMock('../core/scheduler', () => ({
  Scheduler: jest.fn().mockImplementation(() => ({
    scheduleTask: mockScheduleTask,
    scheduleCronTask: mockScheduleCronTask,
    cancelTask: mockCancelTask,
    setMaxConcurrency: mockSetMaxConcurrency,
    prioritizeTask: mockPrioritizeTask,
    getRunningTasks: mockGetRunningTasks,
    pauseTask: mockPauseTask,
    resumeTask: mockResumeTask,
    getTaskStatistics: mockGetTaskStatistics
  }))
}));

jest.doMock('../core/concurrency-monitor', () => ({
  ConcurrencyMonitor: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn()
  }))
}));

jest.doMock('../core/cluster-scheduler');
jest.doMock('../config');

// Import after mocks are set up
const temporos = require('../index').default;
const { Scheduler } = require('../core/scheduler');
const { ClusterScheduler } = require('../core/cluster-scheduler');
const { Task } = require('../core/task');
const { TemporosError, ErrorCode } = require('../utils/error-handler');

describe('Temporos API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Exports', () => {
    test('should export Task class', () => {
      expect(temporos.Task).toBe(Task);
    });
    
    test('should export Scheduler class', () => {
      expect(temporos.Scheduler).toBe(Scheduler);
    });
    
    test('should export ClusterScheduler class', () => {
      expect(temporos.ClusterScheduler).toBe(ClusterScheduler);
    });
    
    test('should export TemporosError', () => {
      expect(temporos.TemporosError).toBe(TemporosError);
    });
    
    test('should export ErrorCode', () => {
      expect(temporos.ErrorCode).toBe(ErrorCode);
    });
    
    test('should export TaskStatus', () => {
      expect(temporos.TaskStatus).toBe(TaskStatus);
    });
  });
  
  describe('Task scheduling', () => {
    test('should schedule a task', () => {
      const callback = jest.fn();
      const interval = 1000;
      const options = { name: 'test-task' };
      
      const taskId = temporos.scheduleTask(callback, interval, options);
      
      expect(mockScheduleTask).toHaveBeenCalledWith(callback, interval, options);
      expect(taskId).toBe('task-id');
    });
    
    test('should schedule a cron task', () => {
      const callback = jest.fn();
      const cronExpression = '* * * * *';
      const options = { name: 'test-cron-task' };
      
      const taskId = temporos.scheduleCronTask(callback, cronExpression, options);
      
      expect(mockScheduleCronTask).toHaveBeenCalledWith(callback, cronExpression, options);
      expect(taskId).toBe('cron-task-id');
    });
    
    test('should cancel a task', () => {
      const result = temporos.cancelTask('task-id');
      
      expect(mockCancelTask).toHaveBeenCalledWith('task-id');
      expect(result).toBe(true);
    });
    
    test('should set max concurrency', () => {
      temporos.setMaxConcurrency(5);
      
      expect(mockSetMaxConcurrency).toHaveBeenCalledWith(5);
    });
    
    test('should prioritize a task', () => {
      const result = temporos.prioritizeTask('task-id', 10);
      
      expect(mockPrioritizeTask).toHaveBeenCalledWith('task-id', 10);
      expect(result).toBe(true);
    });
    
    test('should get running tasks', () => {
      const tasks = temporos.getRunningTasks();
      
      expect(mockGetRunningTasks).toHaveBeenCalled();
      expect(tasks).toEqual(['task-1', 'task-2']);
    });
    
    test('should pause a task', () => {
      const result = temporos.pauseTask('task-id');
      
      expect(mockPauseTask).toHaveBeenCalledWith('task-id');
      expect(result).toBe(true);
    });
    
    test('should resume a task', () => {
      const result = temporos.resumeTask('task-id');
      
      expect(mockResumeTask).toHaveBeenCalledWith('task-id');
      expect(result).toBe(true);
    });
    
    test('should get task statistics', async () => {
      const stats = await temporos.getTaskStatistics('task-id');
      
      expect(mockGetTaskStatistics).toHaveBeenCalledWith('task-id');
      expect(stats).toEqual([{
        taskId: 'task-id',
        startTime: expect.any(Number),
        endTime: expect.any(Number),
        executionTime: 100,
        status: TaskStatus.COMPLETED
      }]);
    });
  });
  
  describe('Concurrency Monitor', () => {
    test('should start the concurrency monitor', () => {
      const interval = 5000;
      temporos.startConcurrencyMonitor(interval);
      
      // The concurrency monitor is mocked, so we can't check its methods directly
      // We're just ensuring the function doesn't throw
    });
    
    test('should stop the concurrency monitor', () => {
      temporos.stopConcurrencyMonitor();
      
      // The concurrency monitor is mocked, so we can't check its methods directly
      // We're just ensuring the function doesn't throw
    });
  });
  
  describe('Configuration', () => {
    test('should expose getConfig', () => {
      expect(temporos.getConfig).toBeDefined();
    });
    
    test('should expose updateConfig', () => {
      expect(temporos.updateConfig).toBeDefined();
    });
  });
  
  describe('Cluster Scheduler', () => {
    test('should create a cluster scheduler', () => {
      const clusterScheduler = temporos.createClusterScheduler(4);
      
      expect(ClusterScheduler).toHaveBeenCalledWith(4);
      expect(clusterScheduler).toBeDefined();
    });
  });
}); 