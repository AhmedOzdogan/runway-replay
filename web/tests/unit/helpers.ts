import type { Airport } from "../../src/types/airport";
import type { Flight, Point } from "../../src/types/flight";

/** A small test airport: Munich-like position, 1500 ft elevation. */
export const AIRPORT: Airport = {
  name: "Test",
  center: [11.78, 48.35],
  elevationFt: 1500,
};

/** A flight flying due east along latitude 48.35, one point per (time, lon, altitude). */
export function flightThrough(
  points: [time: number, lon: number, altitude: number][],
): Flight {
  return {
    icao: "abc123",
    registration: "D-TEST",
    type: "A320",
    callsign: "TST1",
    category: "A3",
    points: points.map(
      ([time, lon, altitude]): Point => [time, lon, 48.35, altitude],
    ),
  };
}
