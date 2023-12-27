const cron = require('cron-parser');
const Task = require('./task');

let counter = 0;

class Scheduler {
  constructor() {
    this.tasks = new Map();
    this.maxConcurrency = Infinity;
    this.runningTasks = new Set();
    this.logger = console.log;
    this.priorityQueue = [];
  }

  scheduleTask(callback, interval, options = {}) {
    const taskId = `task_${counter++}`;
    const task = new Task(callback, interval, options);
    this.tasks.set(taskId, task);
  
    if (interval === 0) {
      // Immediate execution
      setImmediate(() => this.runTask(taskId));
    } else {
      // Delayed execution
      setTimeout(() => this.runTask(taskId), interval);
    }
    return taskId;
  }  

  scheduleCronTask(callback, cronExpression, options = {}) {
    const nextRun = cron.parseExpression(cronExpression).next().getTime();
    const interval = nextRun - Date.now();
    const task = new Task(callback, interval, options);
    task.dependencyCount = options.dependencies ? options.dependencies.length : 0;
    task.nextRunTime = nextRun;
    const taskId = `task_${counter++}`;
    this.tasks.set(taskId, task);
    this.runTask(taskId);
    return taskId;
  }

  cancelTask(taskId) {
    this.tasks.delete(taskId);
  }

  setMaxConcurrency(max) {
    this.maxConcurrency = max;
    this.runTasks();
  }

  prioritizeTask(taskId, priority) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.priority = priority;
      this.priorityQueue.push(task);
      this.priorityQueue.sort((a, b) => b.priority - a.priority); // Sort by priority
    }
  }

  async runTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task || task.isRunning || !task.isDue()) {
      return;
    }

    if (task.dependencyCount > 0) {
      const allDependenciesResolved = task.dependencies.every(depId => !this.tasks.get(depId) || !this.tasks.get(depId).isRunning);
      if (!allDependenciesResolved) {
        setTimeout(() => this.runTask(taskId), 100); // Check again later
        return;
      }
    }

    if (this.runningTasks.size >= this.maxConcurrency) {
      setTimeout(() => this.runTask(taskId), 100); // Check again later for concurrency
      return;
    }

    if (this.priorityQueue.length > 0) {
      const highestPriorityTask = this.priorityQueue.shift();
      await highestPriorityTask.run();
      this.runningTasks.delete(highestPriorityTask.taskId);
      this.checkDependencies(highestPriorityTask.taskId);
      return;
    }

    this.runningTasks.add(taskId);
    try {
      await task.run();
    } catch (error) {
      this.logger(`Error in task ${taskId}: ${error}`);
    } finally {
      this.runningTasks.delete(taskId);
      this.checkDependencies(taskId);
      if (task.batch && task.interval > 0) {
        setTimeout(() => this.runTask(taskId), task.interval); // Re-schedule if it's a batch task
      }
    }
  }

  async runTasks() {
    const tasksToRun = Array.from(this.tasks.values())
      .filter(task => task.isDue() && task.dependencyCount === 0 && !task.isRunning)
      .sort((a, b) => b.priority - a.priority);
    for (const task of tasksToRun) {
      await this.runTask(task.taskId);
    }
  }

  checkDependencies(completedTaskId) {
    this.tasks.forEach((task, taskId) => {
      if (task.dependencies.includes(completedTaskId)) {
        task.dependencyCount--;
        if (task.dependencyCount === 0) {
          setImmediate(() => this.runTask(taskId)); // Run the task immediately if dependencies are resolved
        }
      }
    });
  }
  
  runBatchTasks() {
    const tasksToRun = [];
    for (const task of this.tasks.values()) {
      if (task.isDue() && task.dependencyCount === 0 && !task.isRunning) {
        tasksToRun.push(task);
      }
    }
    tasksToRun.sort((a, b) => a.priority - b.priority || a.nextRunTime - b.nextRunTime);
    const batchTasks = tasksToRun.splice(0, this.maxConcurrency - this.runningTasks.size);
    for (const task of batchTasks) {
      this.runningTasks.add(task.taskId);
      task.run().then(() => {
        this.runningTasks.delete(task.taskId);
        this.checkDependencies(task.taskId);
        this.runBatchTasks();
      });
    }
  }

  getRunningTasks() {
    const runningTasks = Array.from(this.tasks.values()).filter(task => task.isRunning);
    if (runningTasks.length === 0) {
      return 0;
    }
    return runningTasks.map(task => task.taskId);
  }
}

module.exports = new Scheduler();