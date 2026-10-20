import { describe, expect, it } from "vitest";
import type { Airport } from "../types/airport";
import type { Flight, Point } from "../types/flight";
import { fillMissingEnds } from "./estimate";
import { findGoAround } from "./goAround";
import { planeAt } from "./planes";
import { classifyFlight, describeStatus } from "./status";

const AIRPORT: Airport = {
  name: "Test",
  center: [11.78, 48.35],
  elevationFt: 1500,
};

/** A flight flying due east along latitude 48.35, one point per (time, lon, altitude). */
function flightThrough(
  points: [time: number, lon: number, altitude: number][],
): Flight {
  return {
    icao: "abc123",
    registration: "D-TEST",
    type: "A320",
    callsign: "TST1",
    points: points.map(
      ([time, lon, altitude]): Point => [time, lon, 48.35, altitude],
    ),
  };
}

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

describe("fillMissingEnds", () => {
  it("lands an arrival whose data stops just above the runway", () => {
    const arrival = flightThrough([
      [0, 11.74, 2300],
      [10, 11.75, 2200], // last point: ~700 ft above the field, ~2 km out
    ]);
    const [filled] = fillMissingEnds([arrival], AIRPORT);
    expect(filled.estimatedAfter).toBe(10);
    expect(filled.points.at(-1)?.[3]).toBe(0);
    expect(classifyFlight(filled).kind).toBe("arrival");
  });
});

describe("describeStatus", () => {
  it("doesn't count down to a landing that comes after an unflown go-around", () => {
    const flight = {
      ...flightThrough([
        [0, 11.6, 6000],
        [600, 11.78, 0],
      ]),
      goAroundAt: 300,
    };
    const plane = planeAt(flight, 100);
    expect(plane && describeStatus(plane, 100)).toBe("On approach");
    const afterGoAround = planeAt(flight, 310);
    expect(afterGoAround && describeStatus(afterGoAround, 310)).toBe(
      "GO AROUND!",
    );
  });
});
