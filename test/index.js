const temporos = require('../index');

// Test basic task scheduling
const taskId = temporos.scheduleTask(() => console.log('Hello, world!'), 1000);
console.log(`Scheduled task with ID ${taskId}`);

// Test task cancellation
setTimeout(() => {
  temporos.cancelTask(taskId);
  console.log(`Cancelled task with ID ${taskId}`);
}, 5000);

// Test batch task scheduling
const batchTasks = [
  {
    callback: () => console.log('Batch task 1'),
    interval: 5000
  },
  {
    callback: () => console.log('Batch task 2'),
    interval: 10000
  },
  {
    callback: () => console.log('Batch task 3'),
    interval: 15000
  }
];
batchTasks.forEach(task => temporos.scheduleTask(task.callback, task.interval, { batch: true }));

// Test task dependencies
const task1Id = temporos.scheduleTask(() => console.log('Task 1'), 1000);
const task2Id = temporos.scheduleTask(() => console.log('Task 2'), 2000, { dependencies: [task1Id] });
const task3Id = temporos.scheduleTask(() => console.log('Task 3'), 3000, { dependencies: [task2Id] });

// Test concurrency control
temporos.setMaxConcurrency(2);
for (let i = 1; i <= 10; i++) {
  temporos.scheduleTask(() => {
    console.log(`Concurrent task ${i}`);
    return new Promise(resolve => setTimeout(resolve, 5000));
  }, 1000);
}

// Test advanced scheduling options
const weekdayTaskId = temporos.scheduleTask(() => console.log('Weekday task'), 86400000, {
  weekdays: [1, 3, 5]
});
const timeOfDayTaskId = temporos.scheduleTask(() => console.log('Time of day task'), 86400000, {
  timesOfDay: ['08:00', '12:00', '16:00']
});

// Test external system integration (just an example)
const messageQueue = {
  getNextMessage: () => new Promise(resolve => setTimeout(() => resolve('Test message'), 5000))
};
async function processMessage() {
  const message = await messageQueue.getNextMessage();
  console.log(`Processing message: ${message}`);
  await new Promise(resolve => setTimeout(resolve, 5000));
  console.log(`Processed message: ${message}`);
  await processMessage();
}
temporos.scheduleTask(processMessage, 0);

// Test dynamic concurrency control
temporos.startConcurrencyMonitor();
setTimeout(() => temporos.stopConcurrencyMonitor(), 30000);

// Test custom logging
temporos.scheduleTask(() => console.log('Custom logging'), 5000, {
  logger: msg => console.log(`[${new Date().toISOString()}] ${msg}`)
});

// Test getRunningTasks
setTimeout(() => {
  const runningTasks = temporos.getRunningTasks();
  console.log(`Running tasks: ${runningTasks.join(', ')}`);
}, 15000);