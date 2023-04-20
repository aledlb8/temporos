const { scheduleTask, cancelTask } = require('../lib/scheduler');

const taskId = scheduleTask(() => {
  console.log('Task running');
}, 1000);

setTimeout(() => {
  cancelTask(taskId);
}, 5000);