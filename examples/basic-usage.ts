import temporos from '../src';

console.log('Temporos Basic Usage Example');
console.log('----------------------------');

// Schedule a simple task to run every 5 seconds
const taskId = temporos.scheduleTask(() => {
  console.log(`[${new Date().toISOString()}] Simple task executed`);
}, 5000);

console.log(`Scheduled simple task with ID: ${taskId}`);

// Schedule a task using a cron expression (every minute)
const cronTaskId = temporos.scheduleCronTask(() => {
  console.log(`[${new Date().toISOString()}] Cron task executed`);
}, '* * * * *');

console.log(`Scheduled cron task with ID: ${cronTaskId}`);

// Schedule a task with dependencies
const parentTaskId = temporos.scheduleTask(() => {
  console.log(`[${new Date().toISOString()}] Parent task executed`);
  return new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate async work
}, 10000);

const childTaskId = temporos.scheduleTask(() => {
  console.log(`[${new Date().toISOString()}] Child task executed (after parent)`);
}, 10000, { dependencies: [parentTaskId] });

console.log(`Scheduled parent task with ID: ${parentTaskId}`);
console.log(`Scheduled child task with ID: ${childTaskId} (depends on ${parentTaskId})`);

// Schedule a task with specific days and times
const scheduledTaskId = temporos.scheduleTask(() => {
  console.log(`[${new Date().toISOString()}] Scheduled task executed`);
}, 86400000, { // Daily
  weekdays: [1, 3, 5], // Monday, Wednesday, Friday
  timesOfDay: ['12:00', '18:00'], // Noon and 6 PM
});

console.log(`Scheduled task with specific days/times with ID: ${scheduledTaskId}`);

// Set a higher priority for a task
temporos.prioritizeTask(taskId, 10);
console.log(`Set priority 10 for task ${taskId}`);

// Start the concurrency monitor
temporos.startConcurrencyMonitor();
console.log('Started concurrency monitor');

// After 30 seconds, pause a task
setTimeout(() => {
  console.log(`Pausing task ${taskId}`);
  temporos.pauseTask(taskId);
  
  // After 10 more seconds, resume the task
  setTimeout(() => {
    console.log(`Resuming task ${taskId}`);
    temporos.resumeTask(taskId);
    
    // After 10 more seconds, cancel all tasks and stop
    setTimeout(() => {
      console.log('Cancelling all tasks and stopping');
      temporos.cancelTask(taskId);
      temporos.cancelTask(cronTaskId);
      temporos.cancelTask(parentTaskId);
      temporos.cancelTask(childTaskId);
      temporos.cancelTask(scheduledTaskId);
      temporos.stopConcurrencyMonitor();
      
      console.log('Example completed');
      process.exit(0);
    }, 10000);
  }, 10000);
}, 30000);

console.log('Example running... (will run for 50 seconds)'); 