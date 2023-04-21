const cron = require('cron-parser');
const Task = require('./task');

let counter = 0;

class Scheduler {
  constructor() {
    this.tasks = new Map();
    this.maxConcurrency = Infinity;
    this.runningTasks = new Set();
    this.logger = console.log;
  }

  scheduleTask(callback, interval, { dependencies = [], batch = false, logger = console.log, weekdays = [], timesOfDay = [] } = {}) {
    const task = new Task(callback, interval, { dependencies, batch, logger, weekdays, timesOfDay });
    task.dependencyCount = dependencies.length;
    const taskId = `task_${counter++}`;
    this.tasks.set(taskId, task);
    this.runTask(taskId);
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

  async runTask(taskId) {
    const task = this.tasks.get(taskId);
    if (task && !task.isRunning && task.isDue() && task.dependencyCount === 0) {
      if (this.runningTasks.size < this.maxConcurrency) {
        this.runningTasks.add(taskId);
        await task.run();
        this.runningTasks.delete(taskId);
        this.checkDependencies(taskId);
        this.runBatchTasks();
        this.logger(`Task ${taskId} completed successfully.`);
      } else {
        this.logger(`Task ${taskId} is waiting for available concurrency slot.`);
        setTimeout(() => this.runTask(taskId), 100);
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

  checkDependencies(taskId) {
    for (const task of this.tasks.values()) {
      if (task.dependencies.includes(taskId)) {
        task.dependencyCount--;
        if (task.dependencyCount === 0) {
          this.runTask(this.tasks.key(task));
        }
      }
    }
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