# Temporos

Temporos is a flexible and efficient task scheduler for Node.js. It allows you to schedule tasks to run at specific intervals and provides options for concurrency control and task batching.

## Installation

To install Temporos, use npm:

```sh
npm install temporos
```

## Usage
To schedule a task, use the `scheduleTask` function:

```js
const { scheduleTask } = require('temporos');

const taskId = scheduleTask(() => {
  console.log('Task running');
}, 1000);
```

To cancel a task, use the `cancelTask` function:

```js
const { cancelTask } = require('temporos');

cancelTask(taskId);
```

To set the maximum number of concurrent tasks, use the `setMaxConcurrency` function:

```js
const { setMaxConcurrency } = require('temporos');

setMaxConcurrency(2);
```

To execute tasks in batches, use the `Batch` class:

```js
const { Batch } = require('temporos');

const batchSize = 3;
const batch = new Batch(batchSize);

scheduleTask(() => {
  batch.add(() => {
    console.log('Task 1');
  });
}, 1000);

scheduleTask(() => {
  batch.add(() => {
    console.log('Task 2');
  });
}, 100);

scheduleTask(() => {
  batch.add(() => {
    console.log('Task 3');
  });
}, 1000);
```

For more information, see the [API documentation](https://github.com/aledlb8/temporos#api).

## API Documentation

### `scheduleTask(callback, interval)`
Schedules a task to run at the specified interval.

- `callback` - The function to run when the task is executed.
- `interval` - The interval in milliseconds at which the task should be executed.

Returns the ID of the scheduled task.

Example:

```js
const taskId = scheduleTask(() => {
  console.log('Task running');
}, 1000);
```

### `cancelTask(id)`
Cancels the task with the specified ID.

- `id` - The ID of the task to cancel.

Example:

```
cancelTask(taskId);
```

### `setMaxConcurrency(max)`
Sets the maximum number of concurrent tasks.

- `max` - The maximum number of concurrent tasks.

Example:

```js
setMaxConcurrency(2);
```

`Batch`
The `Batch` class allows you to execute tasks in batches.

`constructor(batchSize)`
Creates a new `Batch` instance with the specified batch size.

- `batchSize` - The maximum number of tasks to execute in a batch.

Example:

```js
const batchSize = 3;
const batch = new Batch(batchSize);
```

`add(task)`
Adds a task to the batch. If the batch is full, the tasks in the batch are executed.

- `task` - The function to run when the task is executed.

Example:

```js
batch.add(() => {
  console.log('Task 1');
});
```

# License
Temporos is licensed under the [MIT License]().