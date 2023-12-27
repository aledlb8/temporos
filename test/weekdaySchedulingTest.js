const TestModule = require('./testModule');
const test = new TestModule();

// Schedule a task to run on specific weekdays
test.scheduleTestTask('Weekday Task', 86400000, {
  weekdays: [1, 3, 5] // Mondays, Wednesdays, and Fridays
});