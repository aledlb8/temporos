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
To schedule a task, call the `  ` function and pass it a callback function and an interval in milliseconds:

```js
const taskId = temporos.scheduleTask(myCallback, 60000); // Run myCallback every minute
```

### Customizable Logging
Temporos provides a default logging function that logs to the console, but users can also provide their own custom logging function. To do this, simply pass a logger function as an option when scheduling a task:

```js
function customLogger(msg) {
  // Implement custom logging here
}

temporos.scheduleTask(myTask, 5000, { logger: customLogger });
```

### Advanced Scheduling Options
By default, tasks are scheduled to run at a fixed interval, but Temporos also provides options for more advanced scheduling. For example, tasks can be scheduled to run on specific days of the week or at specific times of day.

```js
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

```js
function taskA() {
  console.log('Running task A...');
}

function taskB() {
  console.log('Running task B...');
}

const taskIdA = temporos.scheduleTask(taskA, 5000);
const taskIdB = temporos.scheduleTask(taskB, 5000, { dependencies: [taskIdA] })
```
In this example, task B will not run until task A has completed.

### Dynamic Concurrency Control
Temporos allows you to set a maximum concurrency level for running tasks, and will automatically adjust the concurrency level based on system resource usage. To start the concurrency monitor, use the `startConcurrencyMonitor` method:

```js
temporos.startConcurrencyMonitor();
```

To set the maximum concurrency level, use the `setMaxConcurrency` method:

```js
temporos.setMaxConcurrency(4);
```

### Batch Task Scheduling
Temporos also allows you to schedule tasks in batches, instead of running each task as soon as it's due. To use batch task scheduling, simply schedule tasks as usual, and Temporos will automatically group tasks that are due at the same time together and run them in batches, up to the maximum concurrency level. To enable batch task scheduling, simply set the `batch` option to `true` when scheduling a task:

```js
const taskId = temporos.scheduleTask(myCallback, 60000, { batch: true });
```

### Integration with External Systems
Temporos can be easily integrated with external systems by scheduling tasks based on events or data from those systems. For example, you could schedule a task to run every time a new record is added to a database table, or every time a message is received from a message queue.

The specific details of the integration will depend on the external system being used, but Temporos provides a flexible API that can be adapted to a wide range of use cases.

## API
Temporos offers the following methods:

- `scheduleTask(callback: function, interval: number, options?: object): symbol` - Schedules a task to run at the specified interval. Returns a unique task ID.
- `cancelTask(taskId: symbol): void` - Cancels a scheduled task.
- `startConcurrencyMonitor(interval?: number): void` - Starts the concurrency monitor, which adjusts the maximum concurrency level based on system resource usage. The interval parameter - specifies how often to check system resource usage (default is 1000ms).
- `setMaxConcurrency(max: number): void` - Sets the maximum concurrency level for running tasks.
- `getRunningTasks(): symbol[]` - Returns an array of task IDs for tasks that are currently running.

## Contributing
Contributions to Temporos are welcome! To contribute, please fork the repository and submit a pull request.

## License
Temporos is licensed under the MIT license. See the [LICENSE]() file for details.