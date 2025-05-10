# Temporos

Temporos is an enterprise-grade task scheduler for Node.js applications. It provides a robust, flexible, and efficient solution for scheduling and managing tasks with features designed for high-reliability production environments.

[![npm version](https://badge.fury.io/js/temporos.svg)](https://badge.fury.io/js/temporos)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](https://www.typescriptlang.org/)

## Features

- **TypeScript Support**: Full TypeScript integration with comprehensive type definitions
- **Flexible Scheduling**: Schedule tasks at fixed intervals, using cron expressions, on specific days of the week, or at specific times of day
- **Task Dependencies**: Define dependencies between tasks to ensure proper execution order
- **Concurrency Control**: Limit the number of tasks that can run simultaneously, with dynamic adjustment based on system load
- **Distributed Execution**: Run tasks across multiple processes using Node.js cluster module
- **Robust Error Handling**: Comprehensive error handling with custom error types and detailed logging
- **Task Prioritization**: Assign priorities to tasks to control execution order
- **Task Lifecycle Management**: Pause, resume, and cancel tasks as needed
- **Execution Statistics**: Track task execution history and performance metrics
- **Event-based Architecture**: Subscribe to task lifecycle events for custom integrations
- **Configurable Logging**: Structured logging with customizable log levels and formats
- **Retry Mechanism**: Automatically retry failed tasks with configurable attempts and delays

## Installation

```bash
npm install temporos
```

## Basic Usage

```typescript
import temporos from 'temporos';

// Schedule a simple task to run every 5 seconds
const taskId = temporos.scheduleTask(() => {
  console.log('Task executed at', new Date());
}, 5000);

// Schedule a task using a cron expression
temporos.scheduleCronTask(() => {
  console.log('Cron task executed at', new Date());
}, '*/10 * * * *'); // Run every 10 minutes

// Cancel a task
temporos.cancelTask(taskId);
```

## Advanced Usage

### Task Dependencies

```typescript
import temporos from 'temporos';

// Schedule a task that other tasks will depend on
const taskAId = temporos.scheduleTask(async () => {
  console.log('Task A executed');
  await someAsyncOperation();
}, 60000);

// Schedule a task that depends on Task A
temporos.scheduleTask(() => {
  console.log('Task B executed after Task A completed');
}, 60000, { dependencies: [taskAId] });
```

### Dynamic Concurrency Control

```typescript
import temporos from 'temporos';

// Set a fixed maximum concurrency
temporos.setMaxConcurrency(5);

// Or enable dynamic concurrency based on system load
temporos.startConcurrencyMonitor();

// Later, stop the concurrency monitor
temporos.stopConcurrencyMonitor();
```

### Task Prioritization

```typescript
import temporos from 'temporos';

const lowPriorityTaskId = temporos.scheduleTask(() => {
  console.log('Low priority task');
}, 60000);

const highPriorityTaskId = temporos.scheduleTask(() => {
  console.log('High priority task');
}, 60000);

// Set priorities (higher number = higher priority)
temporos.prioritizeTask(highPriorityTaskId, 10);
temporos.prioritizeTask(lowPriorityTaskId, 1);
```

### Task Lifecycle Management

```typescript
import temporos from 'temporos';

const taskId = temporos.scheduleTask(() => {
  console.log('Task executed');
}, 60000);

// Pause a task
temporos.pauseTask(taskId);

// Resume a paused task
temporos.resumeTask(taskId);

// Get task statistics
const statistics = await temporos.getTaskStatistics(taskId);
console.log('Task execution history:', statistics);
```

### Distributed Execution with Cluster

```typescript
import temporos from 'temporos';

// Create a cluster scheduler with 4 worker processes
const clusterScheduler = temporos.createClusterScheduler(4);

// Start the cluster
clusterScheduler.start();

// Schedule tasks across the cluster
clusterScheduler.scheduleTask(() => {
  console.log('Task executed in worker process', process.pid);
}, 60000);

// Later, stop the cluster
clusterScheduler.stop();
```

### Custom Configuration

```typescript
import temporos from 'temporos';

// Get the current configuration
const config = temporos.getConfig();

// Update configuration
temporos.updateConfig({
  defaultMaxConcurrency: 8,
  defaultRetryAttempts: 5,
  defaultRetryDelay: 2000,
  persistTaskHistory: true,
  maxTaskHistoryEntries: 50,
  enableMetrics: true,
});
```

### Advanced Task Options

```typescript
import temporos from 'temporos';

temporos.scheduleTask(() => {
  console.log('Advanced task executed');
}, 60000, {
  name: 'ImportantTask',
  description: 'This task performs an important operation',
  priority: 5,
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 5000,
  batch: true,
  weekdays: [1, 3, 5], // Monday, Wednesday, Friday
  timesOfDay: ['08:00', '16:00'], // 8 AM and 4 PM
  tags: ['critical', 'data-processing'],
  logger: (msg) => console.log(`[CustomLogger] ${msg}`),
});
```

## API Reference

### Core Functions

- `scheduleTask(callback, interval, options?)`: Schedule a task to run at a specified interval
- `scheduleCronTask(callback, cronExpression, options?)`: Schedule a task using a cron expression
- `cancelTask(taskId)`: Cancel a scheduled task
- `pauseTask(taskId)`: Pause a task
- `resumeTask(taskId)`: Resume a paused task
- `prioritizeTask(taskId, priority)`: Set a task's priority
- `getRunningTasks()`: Get IDs of all currently running tasks
- `getTaskStatistics(taskId)`: Get execution statistics for a task
- `setMaxConcurrency(max)`: Set the maximum number of concurrent tasks
- `startConcurrencyMonitor(interval?)`: Start the dynamic concurrency monitor
- `stopConcurrencyMonitor()`: Stop the dynamic concurrency monitor
- `createClusterScheduler(numWorkers?)`: Create a distributed cluster scheduler
- `getConfig()`: Get the current configuration
- `updateConfig(newConfig)`: Update the configuration

### Classes

- `Task`: Class for creating custom tasks
- `Scheduler`: Class for creating custom schedulers
- `ClusterScheduler`: Class for creating distributed schedulers

### Enums and Types

- `TaskStatus`: Enum for task status values
- `ErrorCode`: Enum for error codes
- `TemporosError`: Custom error class

## TypeScript Support

Temporos is written in TypeScript and provides comprehensive type definitions:

```typescript
import temporos, { 
  TaskOptions, 
  TaskStatus, 
  TaskStatistics, 
  TemporosConfig 
} from 'temporos';

const options: TaskOptions = {
  name: 'TypedTask',
  priority: 5,
  timeout: 30000,
};

const taskId = temporos.scheduleTask(() => {
  console.log('TypeScript-friendly task');
}, 60000, options);
```

## Contributing

Contributions to Temporos are welcome! Please feel free to submit a Pull Request.

## License

Temporos is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.