import { ConcurrencyMonitor } from '../core/concurrency-monitor';
import { Scheduler } from '../core/scheduler';
import { IConcurrencyMonitor } from '../interfaces/concurrency.interface';
import * as os from 'os';
import { getConfig } from '../config';

// Mock dependencies
jest.mock('os', () => ({
  loadavg: jest.fn().mockReturnValue([1.0, 0.5, 0.25]),
  cpus: jest.fn().mockReturnValue(Array(4).fill({}))
}));

jest.mock('../config', () => ({
  getConfig: jest.fn().mockReturnValue({
    defaultMaxConcurrency: 4,
    concurrencyMonitorInterval: 1000,
    maxSystemLoadPercentage: 80
  })
}));

describe('ConcurrencyMonitor', () => {
  let scheduler: { setMaxConcurrency: jest.Mock };
  let concurrencyMonitor: ConcurrencyMonitor;
  let emitSpy: jest.SpyInstance;
  
  beforeEach(() => {
    jest.useFakeTimers();
    scheduler = { setMaxConcurrency: jest.fn() };
    concurrencyMonitor = new ConcurrencyMonitor(scheduler);
    emitSpy = jest.spyOn(concurrencyMonitor, 'emit');
  });
  
  afterEach(() => {
    concurrencyMonitor.stop();
    jest.clearAllMocks();
    jest.useRealTimers();
  });
  
  describe('initialization', () => {
    test('should initialize with default values', () => {
      expect(concurrencyMonitor.getMaxConcurrency()).toBe(4);
    });
  });
  
  describe('start', () => {
    test('should start monitoring with default interval', () => {
      concurrencyMonitor.start();
      
      expect(emitSpy).toHaveBeenCalledWith('started', 1000);
      expect(setInterval).toHaveBeenCalled();
    });
    
    test('should start monitoring with custom interval', () => {
      const customInterval = 5000;
      concurrencyMonitor.start(customInterval);
      
      expect(emitSpy).toHaveBeenCalledWith('started', customInterval);
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), customInterval);
    });
    
    test('should not start if already running', () => {
      concurrencyMonitor.start();
      const initialCallCount = (setInterval as jest.Mock).mock.calls.length;
      
      // Try to start again
      concurrencyMonitor.start();
      
      // Should not call setInterval again
      expect((setInterval as jest.Mock).mock.calls.length).toBe(initialCallCount);
    });
    
    test('should adjust concurrency when interval triggers', () => {
      concurrencyMonitor.start();
      
      // Fast-forward timer to trigger the interval
      jest.advanceTimersByTime(1000);
      
      // Should have adjusted concurrency
      expect(scheduler.setMaxConcurrency).toHaveBeenCalled();
    });
  });
  
  describe('stop', () => {
    test('should stop monitoring', () => {
      concurrencyMonitor.start();
      concurrencyMonitor.stop();
      
      expect(emitSpy).toHaveBeenCalledWith('stopped');
      expect(clearInterval).toHaveBeenCalled();
    });
    
    test('should do nothing if not running', () => {
      // Monitor is not started
      concurrencyMonitor.stop();
      
      // Should not try to clear any interval
      expect(clearInterval).not.toHaveBeenCalled();
      expect(emitSpy).not.toHaveBeenCalledWith('stopped');
    });
  });
  
  describe('setMaxConcurrency', () => {
    test('should set max concurrency', () => {
      const newMax = 8;
      concurrencyMonitor.setMaxConcurrency(newMax);
      
      expect(concurrencyMonitor.getMaxConcurrency()).toBe(newMax);
      expect(scheduler.setMaxConcurrency).toHaveBeenCalledWith(newMax);
      expect(emitSpy).toHaveBeenCalledWith('maxConcurrencyChanged', newMax);
    });
    
    test('should ignore invalid values', () => {
      const initialMax = concurrencyMonitor.getMaxConcurrency();
      
      // Test with negative value
      concurrencyMonitor.setMaxConcurrency(-1);
      expect(concurrencyMonitor.getMaxConcurrency()).toBe(initialMax);
      
      // Test with zero
      concurrencyMonitor.setMaxConcurrency(0);
      expect(concurrencyMonitor.getMaxConcurrency()).toBe(initialMax);
      
      // Test with non-numeric value
      concurrencyMonitor.setMaxConcurrency(NaN);
      expect(concurrencyMonitor.getMaxConcurrency()).toBe(initialMax);
    });
  });
  
  describe('getSystemLoad', () => {
    test('should calculate system load correctly', () => {
      // Mock loadavg to return [2.0, 1.0, 0.5] (first value is 2.0)
      (os.loadavg as jest.Mock).mockReturnValueOnce([2.0, 1.0, 0.5]);
      // Mock 4 CPUs
      (os.cpus as jest.Mock).mockReturnValueOnce(Array(4).fill({}));
      
      // Expected load: (2.0 / 4) * 100 = 50%
      const load = concurrencyMonitor.getSystemLoad();
      expect(load).toBe(50);
    });
    
    test('should cap system load at 100%', () => {
      // Mock very high load
      (os.loadavg as jest.Mock).mockReturnValueOnce([10.0, 8.0, 6.0]);
      // Mock 2 CPUs
      (os.cpus as jest.Mock).mockReturnValueOnce(Array(2).fill({}));
      
      // Expected load: (10.0 / 2) * 100 = 500%, but should be capped at 100%
      const load = concurrencyMonitor.getSystemLoad();
      expect(load).toBe(100);
    });
    
    test('should handle zero CPUs gracefully', () => {
      // Mock empty CPU array (shouldn't happen in reality)
      (os.cpus as jest.Mock).mockReturnValueOnce([]);
      
      // Should not throw and return a valid number
      expect(() => concurrencyMonitor.getSystemLoad()).not.toThrow();
      const load = concurrencyMonitor.getSystemLoad();
      expect(typeof load).toBe('number');
    });
  });
  
  describe('adjustConcurrency', () => {
    test('should reduce concurrency when system load is high', () => {
      // Mock high load (90%)
      jest.spyOn(concurrencyMonitor, 'getSystemLoad').mockReturnValue(90);
      // Mock 4 CPUs
      (os.cpus as jest.Mock).mockReturnValueOnce(Array(4).fill({}));
      
      // Start to trigger adjustConcurrency
      concurrencyMonitor.start();
      jest.advanceTimersByTime(1000);
      
      // Should reduce concurrency to Math.max(1, Math.floor(4 / 2)) = 2
      expect(scheduler.setMaxConcurrency).toHaveBeenCalledWith(2);
      expect(emitSpy).toHaveBeenCalledWith('concurrencyAdjusted', 2, 90);
    });
    
    test('should increase concurrency when system load is low', () => {
      // Mock low load (20%)
      jest.spyOn(concurrencyMonitor, 'getSystemLoad').mockReturnValue(20);
      // Mock 4 CPUs
      (os.cpus as jest.Mock).mockReturnValueOnce(Array(4).fill({}));
      // Mock max load percentage of 80%
      (getConfig as jest.Mock).mockReturnValue({
        ...getConfig(),
        maxSystemLoadPercentage: 80
      });
      
      // Start to trigger adjustConcurrency
      concurrencyMonitor.start();
      jest.advanceTimersByTime(1000);
      
      // Load ratio: 20 / 80 = 0.25
      // Available concurrency: Math.max(1, Math.floor(4 * (1 - 0.25))) = 3
      expect(scheduler.setMaxConcurrency).toHaveBeenCalledWith(3);
      expect(emitSpy).toHaveBeenCalledWith('concurrencyAdjusted', 3, 20);
    });
    
    test('should not adjust concurrency if the calculated value is the same', () => {
      // Set initial concurrency to 2
      concurrencyMonitor.setMaxConcurrency(2);
      jest.clearAllMocks();
      
      // Mock load that would result in concurrency of 2
      jest.spyOn(concurrencyMonitor, 'getSystemLoad').mockReturnValue(60);
      // Mock 4 CPUs
      (os.cpus as jest.Mock).mockReturnValueOnce(Array(4).fill({}));
      // Mock max load percentage of 80%
      (getConfig as jest.Mock).mockReturnValue({
        ...getConfig(),
        maxSystemLoadPercentage: 80
      });
      
      // Start to trigger adjustConcurrency
      concurrencyMonitor.start();
      jest.advanceTimersByTime(1000);
      
      // Should not change concurrency
      expect(scheduler.setMaxConcurrency).not.toHaveBeenCalled();
      expect(emitSpy).not.toHaveBeenCalledWith('concurrencyAdjusted', expect.any(Number), expect.any(Number));
    });
  });
}); 