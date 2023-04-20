const Task = require('./task');
const { canRunTask, taskStarted, taskFinished } = require('./concurrency');

let taskId = 0;
const tasks = [];

function scheduleTask(callback, interval) {
  const task = new Task(taskId++, callback, interval);
  tasks.push(task);
  scheduleNextTask();
  return task.id;
}

function cancelTask(id) {
  const taskIndex = tasks.findIndex((task) => task.id === id);
  if (taskIndex !== -1) {
    tasks.splice(taskIndex, 1);
  }
}

function scheduleNextTask() {
  if (canRunTask() && tasks.length > 0) {
    const task = tasks.shift();
    taskStarted();
    task.run(() => {
      taskFinished();
      scheduleNextTask();
    });
  }
}

module.exports = { scheduleTask, cancelTask };