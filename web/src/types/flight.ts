// Output format of the pipeline, see docs/data-format.md.

/** [secondsSinceMidnightUtc, longitude, latitude, altitudeFt]; altitude is 0 on the ground. */
export type Point = [number, number, number, number];

/** Positions inside a Point, so code reads point[ALTITUDE] instead of point[3]. */
export const TIME = 0;
export const LON = 1;
export const LAT = 2;
export const ALTITUDE = 3;

/** One aircraft's continuous visit to the airport zone (an arrival, a departure, or an overflight). */
export interface Flight {
  icao: string;
  registration: string | null;
  type: string | null;
  callsign: string | null;
  category: string | null;
  points: Point[];
  /** Added in the browser (flights/estimate.ts), not in the file: points before this time are estimated. */
  estimatedBefore?: number;
  /** Added in the browser (flights/estimate.ts), not in the file: points after this time are estimated. */
  estimatedAfter?: number;
  /** Added in the browser (flights/goAround.ts), not in the file: time of a go-around, if there was one. */
  goAroundAt?: number;
}

export interface ReplayFile {
  airport: string;
  date: string;
  /** Unix time of 00:00 UTC on `date`; add a point's TIME to get wall-clock time. */
  dayStart: number;
  flights: Flight[];
}

/** Where an aircraft is at the current replay time (computed in the browser). */
export interface Plane {
  /** The flight it's on, or for a parked plane the flight it parked after (or before). */
  flight: Flight;
  /** [longitude, latitude] */
  position: [number, number];
  /** Degrees clockwise from north. */
  heading: number;
  altitude: number;
  /** Ground speed in knots. */
  speed: number;
  /** Feet per minute, positive when climbing. */
  verticalRate: number;
  /** Seconds since midnight when it parked, or null while moving. 0 means parked since before midnight. */
  parkedSince: number | null;
}
