import temporos from '../src';
import os from 'os';

console.log('Temporos Cluster Usage Example');
console.log('------------------------------');

// Create a cluster scheduler with the number of CPU cores
const numWorkers = os.cpus().length;
const clusterScheduler = temporos.createClusterScheduler(numWorkers);

console.log(`Starting cluster with ${numWorkers} workers`);
clusterScheduler.start();

// Schedule tasks to be distributed across workers
for (let i = 1; i <= 10; i++) {
  const taskId = clusterScheduler.scheduleTask(() => {
    console.log(`[${new Date().toISOString()}] Task ${i} executed in process ${process.pid}`);
    // Simulate some work
    return new Promise((resolve) => setTimeout(resolve, 2000));
  }, 5000);
  
  console.log(`Scheduled task ${i} with ID: ${taskId}`);
}

// Set max concurrency across all workers
clusterScheduler.setMaxConcurrency(5);
console.log('Set max concurrency to 5 across all workers');

// After 30 seconds, get running tasks
setTimeout(async () => {
  const runningTasks = await clusterScheduler.getRunningTasks();
  console.log('Running tasks by worker:');
  
  for (const [workerId, tasks] of Object.entries(runningTasks)) {
    console.log(`Worker ${workerId}: ${tasks.length} tasks running`);
  }
  
  // After 10 more seconds, add a worker
  setTimeout(() => {
    const newWorkerId = clusterScheduler.addWorker();
    console.log(`Added new worker with ID: ${newWorkerId}`);
    
    // After 10 more seconds, remove a worker and stop
    setTimeout(() => {
      console.log('Removing a worker and stopping cluster');
      clusterScheduler.removeWorker(newWorkerId);
      clusterScheduler.stop();
      
      console.log('Example completed');
      process.exit(0);
    }, 10000);
  }, 10000);
}, 30000);

console.log('Example running... (will run for 50 seconds)'); 