const TestModule = require('./testModule');
const test = new TestModule();

// Schedule a task to run at specific times of the day
test.scheduleTestTask('Time of Day Task', 86400000, {
  timesOfDay: ['08:00', '12:00', '16:00']
});