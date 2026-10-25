import { describe, expect, it } from "vitest";
import { stableIndex, stableRank } from "../../../src/utils/stable";

describe("stableIndex", () => {
  it("gives the same index for the same seed", () => {
    expect(stableIndex("abc123-approach", 5)).toBe(
      stableIndex("abc123-approach", 5),
    );
  });

  it("always stays within 0 … count - 1", () => {
    for (const seed of [
      "a",
      "abc123-approach",
      "4ca7b5-takeoff",
      "x".repeat(50),
    ]) {
      const index = stableIndex(seed, 4);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(4);
    }
  });

  // The whole point: different flights should get different variants.
  // A lazy `return 0` passes the two tests above but fails these.
  it("spreads different flights over every variant", () => {
    const indexes = new Set<number>();
    for (let flight = 0; flight < 200; flight++) {
      indexes.add(stableIndex(`flight${flight}-approach`, 5));
    }
    expect(indexes.size).toBe(5);
  });

  it("can give different variants for different phases of the same flight", () => {
    const phases = [
      "approach",
      "clearedToLand",
      "afterLanding",
      "taxiOut",
      "takeoff",
      "goAround",
    ];
    const indexes = new Set(
      phases.map((phase) => stableIndex(`abc123-${phase}`, 4)),
    );
    expect(indexes.size).toBeGreaterThan(1);
  });
});

describe("stableRank", () => {
  const keys = ["a00001", "a00002", "a00005", "a00007", "a00008"];
  const order = (seed: number) =>
    [...keys].sort(
      (first, second) =>
        stableRank(`${seed}-${first}`) - stableRank(`${seed}-${second}`),
    );

  it("gives the same rank for the same key", () => {
    expect(stableRank("1234-a00001")).toBe(stableRank("1234-a00001"));
  });

  it("scatters keys that look alike", () => {
    // stableIndex put these within 1 or 2 of each other, so sorting by it sorted by ICAO address.
    const ranks = keys.map((key) => stableRank(`1234-${key}`));
    const closest = Math.min(
      ...ranks.flatMap((rank, index) =>
        ranks.slice(index + 1).map((other) => Math.abs(rank - other)),
      ),
    );
    expect(closest).toBeGreaterThan(1_000_000);
  });

  it("puts them in a different order for a different seed", () => {
    // A seed written as a prefix used to shift every rank by the same amount, changing nothing.
    expect(order(1234)).not.toEqual(order(4321));
  });
});
