const TestModule = require('./testModule');
const temporos = require('../index');
const test = new TestModule();

// Schedule dependent tasks
const task1Id = temporos.scheduleTask(() => console.log('Task 1'), 1000);
const task2Id = temporos.scheduleTask(() => console.log('Task 2'), 2000, { dependencies: [task1Id] });
test.scheduleTestTask('Dependent Task', 3000, { dependencies: [task2Id] });