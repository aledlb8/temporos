const scheduler = require('./lib/scheduler');
const concurrency = require('./lib/concurrency');
const Task = require('./lib/task.js')

module.exports = {
    Task,
    cancelTask: scheduler.cancelTask.bind(scheduler),
    scheduleTask: scheduler.scheduleTask.bind(scheduler),
    getRunningTasks: scheduler.getRunningTasks.bind(scheduler),
    setMaxConcurrency: concurrency.setMaxConcurrency.bind(concurrency),
    startConcurrencyMonitor: concurrency.start.bind(concurrency),
    stopConcurrencyMonitor: concurrency.stop.bind(concurrency)
};