const TestModule = require('./testModule');
const test = new TestModule();

// Schedule a basic task to run after 2 seconds
test.scheduleTestTask('Basic Task', 2000);