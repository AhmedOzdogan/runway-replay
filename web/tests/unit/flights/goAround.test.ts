import { describe, expect, it } from "vitest";
import { findGoAround } from "../../../src/flights/goAround";
import { AIRPORT, flightThrough } from "../helpers";

describe("findGoAround", () => {
  it("finds an approach that gets low and climbs away without landing", () => {
    const goAround = flightThrough([
      [0, 11.6, 6000],
      [60, 11.7, 3000],
      [120, 11.76, 2100], // 600 ft above the field, near the airport
      [180, 11.8, 4000], // climbs away
    ]);
    expect(findGoAround(goAround, AIRPORT)).toBe(120);
  });

  it("ignores a normal landing and a departure", () => {
    const landing = flightThrough([
      [0, 11.6, 6000],
      [120, 11.76, 2000],
      [180, 11.78, 0],
    ]);
    const departure = flightThrough([
      [0, 11.78, 0],
      [60, 11.8, 2000],
      [120, 11.9, 5000],
    ]);
    expect(findGoAround(landing, AIRPORT)).toBeUndefined();
    expect(findGoAround(departure, AIRPORT)).toBeUndefined();
  });
});
