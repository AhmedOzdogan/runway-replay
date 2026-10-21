import { describe, expect, it } from "vitest";
import { createSerialQueue } from "../../../src/utils/serialQueue";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("createSerialQueue", () => {
  it("runs tasks in the order they were added, even if a later one is faster", async () => {
    const enqueue = createSerialQueue();
    const finished: string[] = [];
    await Promise.all([
      enqueue(async () => {
        await wait(30);
        finished.push("slow first");
      }),
      enqueue(async () => {
        finished.push("fast second");
      }),
    ]);
    expect(finished).toEqual(["slow first", "fast second"]);
  });

  it("never runs two tasks at the same time", async () => {
    const enqueue = createSerialQueue();
    let running = 0;
    let mostAtOnce = 0;
    const task = async () => {
      running++;
      mostAtOnce = Math.max(mostAtOnce, running);
      await wait(5);
      running--;
    };
    await Promise.all([enqueue(task), enqueue(task), enqueue(task)]);
    expect(mostAtOnce).toBe(1);
  });

  it("keeps going after a task fails", async () => {
    const enqueue = createSerialQueue();
    const failing = enqueue(async () => {
      throw new Error("generation failed");
    });
    const next = enqueue(async () => "next line");
    await expect(failing).rejects.toThrow("generation failed");
    await expect(next).resolves.toBe("next line");
  });

  it("returns each task's own result", async () => {
    const enqueue = createSerialQueue();
    const [first, second] = await Promise.all([
      enqueue(async () => 1),
      enqueue(async () => 2),
    ]);
    expect([first, second]).toEqual([1, 2]);
  });
});
