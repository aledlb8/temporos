const cluster = require("cluster");
const os = require("os");
const Scheduler = require("./scheduler");

class TemporosCluster {
  constructor(numWorkers) {
    this.numWorkers = numWorkers || os.cpus().length;
    this.workers = [];
    this.scheduler = new Scheduler();
  }

  start() {
    if (cluster.isMaster) {
      for (let i = 0; i < this.numWorkers; i++) {
        const worker = cluster.fork();
        this.workers.push(worker);
      }
      cluster.on("exit", (worker, code, signal) => {
        console.log(
          `Worker ${worker.process.pid} died with code ${code} and signal ${signal}`
        );
        const newWorker = cluster.fork();
        this.workers.splice(this.workers.indexOf(worker), 1, newWorker);
      });
    } else {
      this.scheduler.runTasks();
    }
  }

  stop() {
    if (cluster.isMaster) {
      for (const worker of this.workers) {
        worker.kill();
      }
      this.workers = [];
    } else {
      this.scheduler.stop();
    }
  }

  scheduleTask(callback, interval, options = {}) {
    if (cluster.isMaster) {
      const worker =
        this.workers[Math.floor(Math.random() * this.workers.length)];
      worker.send({
        type: "scheduleTask",
        callback: callback.toString(),
        interval,
        options,
      });
      return worker.id;
    } else {
      return this.scheduler.scheduleTask(callback, interval, options);
    }
  }

  cancelTask(taskId) {
    if (cluster.isMaster) {
      for (const worker of this.workers) {
        worker.send({
          type: "cancelTask",
          taskId,
        });
      }
    } else {
      this.scheduler.cancelTask(taskId);
    }
  }

  setMaxConcurrency(max) {
    if (cluster.isMaster) {
      for (const worker of this.workers) {
        worker.send({
          type: "setMaxConcurrency",
          max,
        });
      }
    } else {
      this.scheduler.setMaxConcurrency(max);
    }
  }

  getRunningTasks() {
    if (cluster.isMaster) {
      return new Promise((resolve, reject) => {
        const results = {};
        let numWorkers = this.workers.length;
        const handleMessage = (msg) => {
          if (msg.type === "getRunningTasks") {
            results[msg.workerId] = msg.tasks;
            if (--numWorkers === 0) {
              resolve(results);
            }
          }
        };
        for (const worker of this.workers) {
          worker.send({
            type: "getRunningTasks",
            workerId: worker.id,
          });
          worker.on("message", handleMessage);
        }
      });
    } else {
      return this.scheduler.getRunningTasks();
    }
  }
}

module.exports = TemporosCluster;