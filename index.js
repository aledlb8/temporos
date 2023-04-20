const scheduler = require('./lib/scheduler');
const concurrency = require('./lib/concurrency');

module.exports = {
  scheduleTask: scheduler.scheduleTask.bind(scheduler),
  cancelTask: scheduler.cancelTask.bind(scheduler),
  setMaxConcurrency: concurrency.setMaxConcurrency.bind(concurrency),
  startConcurrencyMonitor: concurrency.start.bind(concurrency),
  stopConcurrencyMonitor: concurrency.stop.bind(concurrency)
};