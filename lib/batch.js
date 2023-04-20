class Batch {
  constructor(batchSize) {
    this.batchSize = batchSize;
    this.batch = [];
  }

  add(task) {
    this.batch.push(task);
    if (this.batch.length >= this.batchSize) {
      this.execute();
    }
  }

  execute() {
    const batchTasks = this.batch;
    this.batch = [];
    batchTasks.forEach((task) => task.run());
  }
}

module.exports = Batch;