const Task = require('./task');

class Scheduler {
  constructor() {
    this.tasks = new Map();
    this.maxConcurrency = Infinity;
    this.runningTasks = new Set();
    this.logger = console.log;
  }

  scheduleTask(callback, interval, options) {
    const task = new Task(callback, interval, options);
    task.dependencyCount = options.dependencies ? options.dependencies.length : 0;
    const taskId = Symbol();
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
      } else {
        this.logger(`Task ${taskId} is waiting for available concurrency slot`);
        setTimeout(() => this.runTask(taskId), 100);
      }
    }
  }

  async runTasks() {
    for (const taskId of this.tasks.keys()) {
      await this.runTask(taskId);
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
    tasksToRun.sort((a, b) => a.nextRunTime - b.nextRunTime);
    for (let i = 0; i < tasksToRun.length && this.runningTasks.size < this.maxConcurrency; i++) {
      const task = tasksToRun[i];
      this.runningTasks.add(this.tasks.key(task));
      task.run().then(() => {
        this.runningTasks.delete(this.tasks.key(task));
        this.checkDependencies(this.tasks.key(task));
      });
    }
  }

  getRunningTasks() {
    return Array.from(this.runningTasks);
  }
}

module.exports = new Scheduler();