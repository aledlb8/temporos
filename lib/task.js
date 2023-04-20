class Task {
  constructor(callback, interval, options) {
    this.callback = callback;
    this.interval = interval;
    this.options = options || {};
    this.lastRunTime = null;
    this.nextRunTime = Date.now() + interval;
    this.isRunning = false;
    this.batch = options.batch || false;
    this.logger = options.logger || console.log;
    this.weekdays = options.weekdays || [];
    this.timesOfDay = options.timesOfDay || [];
    this.dependencies = options.dependencies || [];
    this.dependencyCount = options.dependencies ? options.dependencies.length : 0;
  }

  async run() {
    this.lastRunTime = Date.now();
    this.calculateNextRunTime();
    this.isRunning = true;
    try {
      this.logger(`Running task ${this.callback.name}`);
      await this.callback();
    } catch (err) {
      this.logger(`Error running task ${this.callback.name}: ${err.message}`);
    }
    this.isRunning = false;
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