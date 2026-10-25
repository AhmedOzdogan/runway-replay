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
    origin: null,
    destination: null,
    points: points.map(
      ([time, lon, altitude]): Point => [time, lon, 48.35, altitude],
    ),
  };
}

/** Somewhere for a departure to go, so a quiz round has an answer and three wrong options. */
export const DESTINATIONS = [
  { icao: "EDDH", city: "Hamburg" },
  { icao: "EIDW", city: "Dublin" },
  { icao: "LEMD", city: "Madrid" },
  { icao: "LOWW", city: "Vienna" },
  { icao: "LIRF", city: "Rome" },
  { icao: "EDDF", city: "Frankfurt" },
  { icao: "EDDL", city: "Düsseldorf" },
  { icao: "EDDB", city: "Berlin" },
  { icao: "LFPG", city: "Paris" },
  { icao: "EHAM", city: "Amsterdam" },
  { icao: "LSZH", city: "Zurich" },
  { icao: "EKCH", city: "Copenhagen" },
  { icao: "LEBL", city: "Barcelona" },
  { icao: "LPPT", city: "Lisbon" },
  { icao: "ESSA", city: "Stockholm" },
  { icao: "ENGM", city: "Oslo" },
  { icao: "EFHK", city: "Helsinki" },
  { icao: "EPWA", city: "Warsaw" },
  { icao: "LKPR", city: "Prague" },
  { icao: "LGAV", city: "Athens" },
];

/**
 * `count` distinct departures, each ten minutes after the last. Every third one has no
 * destination and every fifth is a ground vehicle, so tests can check what gets filtered out.
 */
export function flightList(count: number): Flight[] {
  return Array.from({ length: count }, (_, index) => {
    const start = index * 600;
    const isVehicle = index % 5 === 4;
    return {
      ...flightThrough(
        isVehicle
          ? [
              [start, 11.78, 0],
              [start + 300, 11.79, 0],
            ]
          : [
              [start, 11.78, 0],
              [start + 300, 11.9, 6000],
            ],
      ),
      icao: `a0${index.toString().padStart(4, "0")}`,
      callsign: isVehicle ? `OPS${index}` : `DLH${index}`,
      category: isVehicle ? "C2" : "A3",
      type: isVehicle ? null : "A320",
      destination:
        isVehicle || index % 3 === 0
          ? null
          : DESTINATIONS[Math.floor(index / 2) % DESTINATIONS.length],
    };
  });
}
