const TestModule = require('./testModule');
const test = new TestModule();

// Schedule batch tasks with different intervals
const batchTasks = [
  { name: 'Batch Task 1', interval: 5000 },
  { name: 'Batch Task 2', interval: 10000 },
  { name: 'Batch Task 3', interval: 15000 }
];

batchTasks.forEach(task => test.scheduleTestTask(task.name, task.interval, { batch: true }));