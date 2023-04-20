const os = require('os');

class Concurrency {
  constructor(scheduler) {
    this.scheduler = scheduler;
    this.maxConcurrency = Infinity;
    this.interval = 5000;
    this.timeout = null;
    this.logger = console.log;
  }

  start() {
    this.timeout = setInterval(() => {
      const currentLoad = os.loadavg()[0];
      const maxLoad = os.cpus().length;
      const availableConcurency = Math.floor(maxLoad - currentLoad);
      if (availableConcurency !== this.maxConcurrency) {
        this.maxConcurrency = availableConcurency;
        this.scheduler.setMaxConcurrency(this.maxConcurrency);
        this.logger(`Concurrency set to ${this.maxConcurrency}`);
      }
    }, this.interval);
  }

  stop() {
    clearInterval(this.timeout);
  }

  setMaxConcurrency(max) {
    this.maxConcurrency = max;
  }
}

module.exports = new Concurrency(require('./scheduler'));