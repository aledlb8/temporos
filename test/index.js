const temporos = require('../index');

// Custom logger function
function myLogger(message) {
  console.log(`[Temporos] ${message}`);
}

// Simple task
function myTask() {
  console.log('Running myTask');
}

// Task with dependencies
function myDependencyTask() {
  console.log('Running myDependencyTask');
}

function myDependentTask() {
  console.log('Running myDependentTask');
}

const dependencyTaskId = temporos.scheduleTask(myDependencyTask, 60000, { logger: myLogger });
const dependentTaskId = temporos.scheduleTask(myDependentTask, 10000, { dependencies: [dependencyTaskId] });

// Advanced scheduling options
class WeekdayTask extends temporos.Task {
  isDue() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    return dayOfWeek === 1 || dayOfWeek === 3; // Monday = 1, Wednesday = 3
  }
}

const weekdayTaskId = temporos.scheduleTask(myTask, 86400000, { TaskClass: WeekdayTask });

// Batch task scheduling
const batchTaskId1 = temporos.scheduleTask(myTask, 60000, { batch: true });
const batchTaskId2 = temporos.scheduleTask(myTask, 60000, { batch: true });

// Cancelling a task
setTimeout(() => {
  temporos.cancelTask(dependencyTaskId);
  console.log(`Cancelled task ${dependencyTaskId}`);
}, 10000);

// Dynamic concurrency control
temporos.setMaxConcurrency(4);

// Get running tasks
setTimeout(() => {
  console.log(`Running tasks: ${temporos.getRunningTasks()}`);
}, 15000);

// Start concurrency monitor
temporos.startConcurrencyMonitor();

// Custom logger
temporos.scheduleTask(myTask, 5000, { logger: myLogger });