const cluster = require('cluster');
const os = require('os');
const Scheduler = require('./scheduler');

class ClusterScheduler extends Scheduler {
  constructor() {
    super();
    if (cluster.isMaster) {
      for (let i = 0; i < os.cpus().length; i++) {
        cluster.fork();
      }
      cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
        cluster.fork();
      });
    } else {
      setInterval(() => {
        if (this.tasks.size > 0) {
          this.runTasks();
        }
      }, 1000);
    }
  }
}

module.exports = ClusterScheduler;