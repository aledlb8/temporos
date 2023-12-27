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
    const now = new Date();

    // Handling specific times of day
    if (this.timesOfDay.length > 0) {
      for (let time of this.timesOfDay) {
        const [hour, minute] = time.split(':').map(Number);
        const nextTime = new Date(now);
        nextTime.setHours(hour, minute, 0, 0);

        if (now < nextTime) {
          this.nextRunTime = nextTime.getTime();
          return;
        }
      }
    }

    // Handling weekdays
    if (this.weekdays.length > 0) {
      do {
        now.setDate(now.getDate() + 1);
      } while (!this.weekdays.includes(now.getDay()));
    }

    this.nextRunTime = now.getTime() + this.interval;
  }


  isDue() {
    return Date.now() >= this.nextRunTime;
  }
}

module.exports = Task;