let maxConcurrency = Infinity;
let runningTasks = 0;

function setMaxConcurrency(max) {
  maxConcurrency = max;
}

function canRunTask() {
  return runningTasks < maxConcurrency;
}

function taskStarted() {
  runningTasks++;
}

function taskFinished() {
  runningTasks--;
}

module.exports = { setMaxConcurrency, canRunTask, taskStarted, taskFinished };