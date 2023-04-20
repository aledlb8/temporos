const { scheduleTask, cancelTask } = require("../lib/scheduler");
const { setMaxConcurrency } = require("../lib/concurrency");

setMaxConcurrency(2);

scheduleTask(() => {
  console.log("Task 1 started");
  setTimeout(() => {
    console.log("Task 1 finished");
  }, 3000);
}, 1000);

scheduleTask(() => {
  console.log("Task 2 started");
  setTimeout(() => {
    console.log("Task 2 finished");
  }, 2000);
}, 1000);

scheduleTask(() => {
  console.log("Task 3 started");
  setTimeout(() => {
    console.log("Task 3 finished");
  }, 1000);
}, 1000);