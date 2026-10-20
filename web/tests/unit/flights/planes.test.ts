import { describe, expect, it } from "vitest";
import { findParkings, planeAt } from "../../../src/flights/planes";
import { flightThrough } from "../helpers";

describe("planeAt", () => {
  it("is halfway between two points at half time, heading east", () => {
    const plane = planeAt(
      flightThrough([
        [0, 11.7, 4000],
        [60, 11.8, 2000],
      ]),
      30,
    );
    expect(plane?.position[0]).toBeCloseTo(11.75);
    expect(plane?.altitude).toBe(3000);
    expect(plane?.heading).toBeCloseTo(90);
    expect(plane?.verticalRate).toBeCloseTo(-2000);
  });

  it("is null outside the flight's time range", () => {
    expect(
      planeAt(
        flightThrough([
          [0, 11.7, 4000],
          [60, 11.8, 2000],
        ]),
        61,
      ),
    ).toBeNull();
  });
});

describe("findParkings", () => {
  // Both flights land; only how fast they're moving at their last point differs.
  // At latitude 48.35, 0.0001° of longitude is about 7 m and 0.0042° about 310 m.

  it("parks a plane whose data ends at taxi speed", () => {
    const reachesGate = flightThrough([
      [0, 11.7, 2000],
      [60, 11.78, 0],
      [70, 11.7801, 0], // ~7 m in 10 s ≈ 1 kt
    ]);
    expect(findParkings([reachesGate])).toHaveLength(1);
  });

  it("doesn't park a plane whose data ends at runway speed", () => {
    const lostOnRunway = flightThrough([
      [0, 11.7, 2000],
      [60, 11.77, 0],
      [70, 11.7742, 0], // ~310 m in 10 s ≈ 60 kt: the receiver lost it mid-rollout
    ]);
    expect(findParkings([lostOnRunway])).toHaveLength(0);
  });
});
