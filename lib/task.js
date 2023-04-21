class Task {
  constructor(callback, interval, options = {}) {
    this.callback = callback;
    this.interval = interval;
    this.options = options;
    this.lastRunTime = null;
    this.nextRunTime = Date.now() + interval;
    this.isRunning = false;
    this.batch = options.batch || false;
    this.logger = options.logger || console.log;
    this.weekdays = options.weekdays || [];
    this.timesOfDay = options.timesOfDay || [];
    this.dependencies = options.dependencies || [];
    this.dependencyCount = 0;
    this.timeout = null;
    this.retryAttempts = options.retryAttempts || 0;
    this.retryDelay = options.retryDelay || 0;
  }

  async run() {
    this.lastRunTime = Date.now();
    this.calculateNextRunTime();
    this.isRunning = true;

    if (this.options.timeout) {
      this.timeout = setTimeout(() => {
        this.logger(`Task ${this.callback.name} timed out after ${this.options.timeout}ms`);
        this.isRunning = false;
      }, this.options.timeout);
    }

    try {
      this.logger(`Running task ${this.callback.name}`);
      await this.callback();
    } catch (err) {
      this.logger(`Error running task ${this.callback.name}: ${err.message}`);
      if (this.retryAttempts > 0) {
        this.logger(`Retrying task ${this.callback.name}`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        this.retryAttempts--;
        await this.run();
      } else {
        this.logger(`Task ${this.callback.name} failed after all retry attempts`);
        throw err;
      }
    } finally {
      this.isRunning = false;
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }

  calculateNextRunTime() {
    let nextRunTime = Date.now() + this.interval;
    const now = new Date();
    while (this.weekdays.length > 0 && !this.weekdays.includes(now.getDay())) {
      now.setDate(now.getDate() + 1);
    }
    while (this.timesOfDay.length > 0) {
      const timeParts = this.timesOfDay.shift().split(':');
      const hour = parseInt(timeParts[0]);
      const minute = parseInt(timeParts[1]);
      if (now.getHours() < hour || (now.getHours() === hour && now.getMinutes() < minute)) {
        now.setHours(hour);
        now.setMinutes(minute);
        nextRunTime = now.getTime();
        break;
      }
    }
    this.nextRunTime = nextRunTime;
  }

  isDue() {
    return Date.now() >= this.nextRunTime;
  }
}

module.exports = Task;