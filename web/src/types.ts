// Output format of the pipeline, see docs/data-format.md.

/** [sec_offset, lon, lat, alt_ft]; alt_ft is 0 on the ground. */
export type Point = [number, number, number, number];

export interface Aircraft {
  icao: string;
  registration: string | null;
  type: string | null;
  callsigns: string[];
  points: Point[];
}

export interface ReplayFile {
  airport: string;
  date: string;
  /** Unix time of 00:00 UTC on `date`; add sec_offset to get wall-clock time. */
  dayStart: number;
  aircraft: Aircraft[];
}
