/**
 * Runs async tasks one at a time, in the order they were added, even when a later task would
 * finish sooner. A failed task doesn't block the ones after it.
 *
 * const enqueue = createSerialQueue();
 * enqueue(() => slow());   // runs first
 * enqueue(() => fast());   // starts only after slow() has finished
 */
export function createSerialQueue(): <T>(task: () => Promise<T>) => Promise<T> {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(task: () => Promise<T>): Promise<T> => {
    const result = tail.then(task, task);
    tail = result.catch(() => undefined); // keep going after a failure
    return result;
  };
}
