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
}

export interface ReplayFile {
  airport: string;
  date: string;
  /** Unix time of 00:00 UTC on `date`; add sec_offset to get wall-clock time. */
  dayStart: number;
  flights: Flight[];
}
