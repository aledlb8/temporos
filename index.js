const scheduler = require('./lib/scheduler');
const concurrency = require('./lib/concurrency');
const Task = require('./lib/task.js');
const ClusterScheduler = require('./lib/cluster-scheduler.js');

process.on('unhandledRejection', (err) => {
    console.error('Unhandled error:', err);
});

module.exports = {
  Task,
  Scheduler: scheduler,
  ClusterScheduler,
  prioritizeTask: (taskId, priority) => {
    scheduler.prioritizeTask(taskId, priority);
  },
  cancelTask: scheduler.cancelTask.bind(scheduler),
  scheduleTask: scheduler.scheduleTask.bind(scheduler),
  getRunningTasks: scheduler.getRunningTasks.bind(scheduler),
  setMaxConcurrency: concurrency.setMaxConcurrency.bind(concurrency),
  startConcurrencyMonitor: concurrency.start.bind(concurrency),
  stopConcurrencyMonitor: concurrency.stop.bind(concurrency)
};
