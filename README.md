# Temporos

Temporos is a Node.js package for scheduling tasks to run at specified intervals. It offers features such as customizable logging, advanced scheduling options, dynamic concurrency control, task dependencies, and batch task scheduling.

## Installation

To install Temporos, use npm:

```sh
npm install temporos
```

## Usage

To use Temporos, first import it into your project:

```javascript
const temporos = require('temporos');
```

### Scheduling a Task
To schedule a task, call the `scheduleTask()` function and pass it a callback function and an interval in milliseconds:

```javascript
const taskId = temporos.scheduleTask(myCallback, 60000); // Run myCallback every minute
```

### Customizable Logging
Temporos provides a default logging function that logs to the console, but users can also provide their own custom logging function. To do this, simply pass a logger function as an option when scheduling a task:

```javascript
function customLogger(msg) {
  // Implement custom logging here
}

temporos.scheduleTask(myTask, 5000, { logger: customLogger });
```

### Advanced Scheduling Options
By default, tasks are scheduled to run at a fixed interval. However, Temporos also provides options for more advanced scheduling, such as running tasks on specific days of the week or at specific times of day. Note: If using `null` as the interval, Temporos will calculate the next run time based on the advanced options provided.

```javascript
function myTask() {
  console.log('Running task...');
}

temporos.scheduleTask(myTask, null, {
  weekdays: [1, 3, 5],  // Run on Mondays, Wednesdays, and Fridays
  timesOfDay: ['09:00', '13:00', '17:00']  // Run at 9am, 1pm, and 5pm
});
```

### Task Dependencies
Sometimes it's necessary to run one task only after another has completed. Temporos provides a mechanism for specifying task dependencies. When scheduling a task, simply provide an array of task IDs that the new task depends on:

```javascript
function taskA() {
  console.log('Running task A...');
}

function taskB() {
  console.log('Running task B...');
}

const taskIdA = temporos.scheduleTask(taskA, 5000);
const taskIdB = temporos.scheduleTask(taskB, 5000, { dependencies: [taskIdA] });
// Task B will not run until task A has completed.
```

### Dynamic Concurrency Control
Temporos allows you to set a maximum concurrency level for running tasks, and will automatically adjust the concurrency level based on system resource usage. To start the concurrency monitor, use the `startConcurrencyMonitor` method:

```javascript
temporos.startConcurrencyMonitor();
```

To set the maximum concurrency level, use the `setMaxConcurrency` method:

```javascript
temporos.setMaxConcurrency(4);
```

### Batch Task Scheduling
Temporos allows you to schedule tasks in batches. To enable batch task scheduling, simply set the `batch` option to `true` when scheduling a task:

```javascript
const taskId = temporos.scheduleTask(myCallback, 60000, { batch: true });
```

### Prioritizing a Task
Temporos allows you to prioritize certain tasks by adding them to a priority queue:

```javascript
const taskId = temporos.scheduleTask(myCallback, 60000);
temporos.prioritizeTask(taskId, 10); // Higher number indicates higher priority
```

### Cluster
This implementation uses the `cluster` module in Node.js to fork multiple worker processes that run the same code. Each worker process checks for tasks to run every second, allowing tasks to be executed concurrently across multiple CPU cores.

```javascript
const ClusterScheduler = require('temporos').ClusterScheduler;
const scheduler = new ClusterScheduler();
```

### Integration with External Systems
Temporos can be easily integrated with external systems by scheduling tasks based on events or data from those systems. The specific details of the integration will depend on the external system being used, but Temporos provides a flexible API that can be adapted to a wide range of use cases.

## API
Temporos offers the following methods:

- `scheduleTask(callback: function, interval: number, options?: object): symbol` - Schedules a task to run at the specified interval. Returns a unique task ID.
- `cancelTask(taskId: symbol): void` - Cancels a scheduled task.
- `startConcurrencyMonitor(interval?: number): void` - Starts the concurrency monitor, which adjusts the maximum concurrency level based on system resource usage. The interval parameter specifies how often to check system resource usage (default is 1000ms).
- `stopConcurrencyMonitor(): void` - Stops the concurrency monitor.
- `setMaxConcurrency(max: number): void` - Sets the maximum concurrency level for running tasks.
- `getRunningTasks(): symbol[]` - Returns an array of task IDs for tasks that are currently running.
- `prioritizeTask(taskId: symbol, priority: number): void` - Adds a task to the priority queue.

## Contributing
Contributions to Temporos are welcome! To contribute, please fork the repository and submit a pull request.

## License
Temporos is licensed under the MIT license. See the [LICENSE](https://github.com/aledlb8/temporos/blob/main/LICENSE) file for details.