# Temporos

Temporos is a Node.js package for scheduling tasks to run at specified intervals. It offers features such as customizable logging, advanced scheduling options, dynamic concurrency control, task dependencies, and batch task scheduling.

## Installation

To install Temporos, use npm:

```sh
npm install temporos
```

## Usage
To use Temporos, you first need to require the package in your code:
```js
const temporos = require('temporos');
```

### Scheduling a Task
To schedule a task, use the `scheduleTask` method, passing in a callback function and the interval at which you want the task to run:
```js
const taskId = temporos.scheduleTask(myCallback, 60000); // Run myCallback every minute
```

You can also pass in optional options object as the third argument, with the following properties:

- `logger`: A custom logger function for logging task execution and errors.
- `dependencies`: An array of task IDs that this task depends on. The task will only run once all its dependencies have completed.

### Cancelling a Task
To cancel a scheduled task, use the `cancelTask` method and pass in the task ID:

```js
temporos.cancelTask(taskId);
```

### Customizable Logging
Temporos allows you to pass in a custom logger function to log task execution and errors. To use a custom logger function, pass in an options object with a `logger` property when scheduling a task:
```js
const taskId = temporos.scheduleTask(myCallback, 60000, { logger: myLogger });
```

### Advanced Scheduling Options
Temporos offers advanced scheduling options, such as scheduling tasks on specific days of the week or at specific times of the day. To use these options, you can create a subclass of `Task` and implement the `isDue` method to check if the task is due to run. Here's an example of a task that runs on Mondays and Wednesdays:

```js
class WeekdayTask extends Task {
  isDue() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    return dayOfWeek === 1 || dayOfWeek === 3; // Monday = 1, Wednesday = 3
  }
}

const taskId = temporos.scheduleTask(myCallback, 86400000, { TaskClass: WeekdayTask }); // Run myCallback every day, but only execute on Mondays and Wednesdays
```

### Dynamic Concurrency Control
Temporos allows you to set a maximum concurrency level for running tasks, and will automatically adjust the concurrency level based on system resource usage. To start the concurrency monitor, use the `startConcurrencyMonitor` method:

```js
temporos.startConcurrencyMonitor();
```

To set the maximum concurrency level, use the `setMaxConcurrency` method:

```js
temporos.setMaxConcurrency(4);
```

### Task Dependencies
Temporos allows you to specify dependencies for tasks, so that a task will only run once all of its dependencies have completed. To specify dependencies, pass in an array of task IDs when scheduling a task:

```js
const task1Id = temporos.scheduleTask(myCallback1, 60000);
const task2Id = temporos.scheduleTask(myCallback2, 120000, { dependencies: [task1Id] }); // Run myCallback2 only after myCallback1 has completed
```

### Batch Task Scheduling
Temporos also allows you to schedule tasks in batches, instead of running each task as soon as it's due. To use batch task scheduling, simply schedule tasks as usual, and Temporos will automatically group tasks that are due at the same time together and run them in batches, up to the maximum concurrency level. To enable batch task scheduling, simply set the `batch` option to `true` when scheduling a task:

```js
const taskId = temporos.scheduleTask(myCallback, 60000, { batch: true });
```

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