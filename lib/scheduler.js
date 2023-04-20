const Task = require('./task');

let counter = 0;

class Scheduler {
  constructor() {
    this.tasks = new Map();
    this.maxConcurrency = Infinity;
    this.runningTasks = new Set();
    this.logger = console.log;
  }

  scheduleTask(callback, interval, { dependencies = [], batch = false, logger = console.log } = {}) {
    const task = new Task(callback, interval, { dependencies, batch, logger });
    task.dependencyCount = dependencies.length;
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
    const runningTasks = Array.from(this.tasks.values()).filter(task => task.isRunning);
    if (runningTasks.length === 0) {
      return 0;
    }
    return runningTasks.map(task => task.taskId);
  }
  
}

module.exports = new Scheduler();