const temporos = require('../index');
const assert = require('assert');

class TestModule {
  constructor() {
    this.expectedRunTimes = new Map();
    this.actualRunTimes = new Map();
  }

  scheduleTestTask(name, interval, options = {}) {
    let expectedRunTime = this.calculateExpectedRunTime(interval, options);
    this.expectedRunTimes.set(name, expectedRunTime);
  
    const taskId = temporos.scheduleTask(() => {
      const actualRunTime = Date.now();
      this.actualRunTimes.set(name, actualRunTime);
      this.verifyTaskTiming(name);
    }, interval, options);
  
    console.log(`Scheduled task "${name}" with ID ${taskId}, expected to run at ${new Date(expectedRunTime).toISOString()}`);
  }
  
  calculateExpectedRunTime(interval, options) {
    const now = new Date();
    if (options.weekdays && options.weekdays.length > 0) {
      while (!options.weekdays.includes(now.getDay())) {
        now.setDate(now.getDate() + 1);
      }
    }
  
    if (options.timesOfDay && options.timesOfDay.length > 0) {
      const nextTimeOfDay = options.timesOfDay.sort()[0].split(':');
      now.setHours(parseInt(nextTimeOfDay[0]), parseInt(nextTimeOfDay[1]), 0, 0);
      if (now.getTime() < Date.now()) {
        now.setDate(now.getDate() + 1); // Next day if time has already passed
      }
    }
  
    return now.getTime() + (interval - (Date.now() - now.getTime()));
  }
  

  verifyTaskTiming(taskName) {
    const expected = this.expectedRunTimes.get(taskName);
    const actual = this.actualRunTimes.get(taskName);
    const errorMargin = 1000; // 1 second margin for error

    try {
      assert(Math.abs(actual - expected) < errorMargin, `Timing error for task "${taskName}": Expected around ${new Date(expected).toISOString()}, but ran at ${new Date(actual).toISOString()}`);
      console.log(`Task "${taskName}" ran as expected at ${new Date(actual).toISOString()}`);
    } catch (error) {
      console.error(error.message);
    }
  }
}

module.exports = TestModule;