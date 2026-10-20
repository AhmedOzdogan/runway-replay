// Output format of the pipeline, see docs/data-format.md.

/** [sec_offset, lon, lat, alt_ft]; alt_ft is 0 on the ground. */
export type Point = [number, number, number, number];

/** One aircraft's continuous visit to the airport zone (an arrival, a departure, or an overflight). */
export interface Flight {
  icao: string;
  registration: string | null;
  type: string | null;
  callsign: string | null;
  points: Point[];
  /** Added in the browser (estimate.ts), not in the file: points before this time are estimated. */
  estimatedBefore?: number;
  /** Added in the browser (estimate.ts), not in the file: points after this time are estimated. */
  estimatedAfter?: number;
  /** Added in the browser (goAround.ts), not in the file: time of a go-around, if there was one. */
  goAroundAt?: number;
}

export interface ReplayFile {
  airport: string;
  date: string;
  /** Unix time of 00:00 UTC on `date`; add sec_offset to get wall-clock time. */
  dayStart: number;
  flights: Flight[];
}
