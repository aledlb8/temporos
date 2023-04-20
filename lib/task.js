class Task {
  constructor(id, callback, interval) {
    this.id = id;
    this.callback = callback;
    this.interval = interval;
    this.isRunning = false;
    this.lastRun = null;
  }

  run() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.lastRun = Date.now();
      this.callback(() => {
        this.isRunning = false;
      });
    }
  }
}

module.exports = Task;