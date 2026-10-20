import type { Airport } from "../types/airport";
import type { Flight, Point } from "../types/flight";
import { distanceKm } from "../utils/geo";

// Receivers often lose aircraft in the last few hundred feet, so arrivals vanish just above the
// runway and departures pop up already climbing. These fill in the missing bit with a simple
// physical estimate. ponytail: straight line along the first/last heading, so only on short final
// or initial climb, where that line is the runway.
const MAX_DISTANCE_KM = 6;
const MAX_HEIGHT_FT = 1500;
const MAX_GROUND_KM = 5; // estimated runway points further out than this are wrong: skip them
const GLIDE_SLOPE = Math.tan((3 * Math.PI) / 180); // standard 3° approach
const CLIMB_GRADIENT = 0.15; // ~9° initial climb
const ROLLOUT_KM = 1.5;
const TAKEOFF_ROLL_KM = 2;
const TAXI_KT = 20;
const FT_TO_KM = 0.0003048;
const KT_TO_KM_PER_S = 1.852 / 3600;
const SAMPLES = 6;

/** Speed (kt) and heading (degrees clockwise from north) from point a to point b. */
function motion(a: Point, b: Point): { kt: number; heading: number } {
  const dx = (b[1] - a[1]) * 111.32 * Math.cos((a[2] * Math.PI) / 180);
  const dy = (b[2] - a[2]) * 110.57;
  const dt = Math.abs(b[0] - a[0]);
  return {
    kt: dt > 0 ? Math.hypot(dx, dy) / dt / KT_TO_KM_PER_S : 0,
    heading: Math.atan2(dx, dy),
  };
}

/** Point `km` away from [lon, lat] along `heading` (radians). */
function move(
  lon: number,
  lat: number,
  heading: number,
  km: number,
): [number, number] {
  return [
    lon + (km * Math.sin(heading)) / (111.32 * Math.cos((lat * Math.PI) / 180)),
    lat + (km * Math.cos(heading)) / 110.57,
  ];
}

function round(p: Point): Point {
  return [
    Math.round(p[0]),
    Math.round(p[1] * 1e4) / 1e4,
    Math.round(p[2] * 1e4) / 1e4,
    Math.round(p[3]),
  ];
}

/** Glide down from the last point to the runway, roll out to taxi speed, then end. */
function landing(last: Point, prev: Point, airport: Airport): Point[] {
  const { heading } = motion(prev, last);
  const kt = Math.max(motion(prev, last).kt, 110); // final approach speed, even if the data is noisy
  const v = kt * KT_TO_KM_PER_S;
  const airKm =
    (Math.max(0, last[3] - airport.elevationFt) * FT_TO_KM) / GLIDE_SLOPE;
  const [tdLon, tdLat] = move(last[1], last[2], heading, airKm);
  const touchdown = last[0] + airKm / v;
  const out: Point[] = [[touchdown, tdLon, tdLat, 0]];
  // Constant deceleration from v to taxi speed over ROLLOUT_KM.
  const vEnd = TAXI_KT * KT_TO_KM_PER_S;
  const decel = (v * v - vEnd * vEnd) / (2 * ROLLOUT_KM);
  const duration = (v - vEnd) / decel;
  for (let i = 1; i <= SAMPLES; i++) {
    const t = (duration * i) / SAMPLES;
    const [lon, lat] = move(tdLon, tdLat, heading, v * t - 0.5 * decel * t * t);
    out.push([touchdown + t, lon, lat, 0]);
  }
  return out.map(round);
}

/** Start standing on the runway, accelerate, lift off, and climb to the first real point. */
function takeoff(first: Point, next: Point, airport: Airport): Point[] {
  const { heading } = motion(first, next);
  const kt = Math.max(motion(first, next).kt, 130);
  const v = kt * KT_TO_KM_PER_S;
  const back = heading + Math.PI;
  const airKm =
    (Math.max(0, first[3] - airport.elevationFt) * FT_TO_KM) / CLIMB_GRADIENT;
  const [loLon, loLat] = move(first[1], first[2], back, airKm);
  const liftoff = first[0] - airKm / v;
  // Constant acceleration from 0 to v over TAKEOFF_ROLL_KM, ending at liftoff.
  const duration = (2 * TAKEOFF_ROLL_KM) / v;
  const out: Point[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    const t = (duration * i) / SAMPLES; // time since brake release
    const remaining = TAKEOFF_ROLL_KM - (v / duration / 2) * t * t;
    const [lon, lat] = move(loLon, loLat, back, remaining);
    out.push([liftoff - duration + t, lon, lat, 0]);
  }
  out.push([liftoff, loLon, loLat, 0]);
  return out.filter((p) => p[0] >= 0).map(round);
}

function closeAndLow(p: Point, airport: Airport): boolean {
  return (
    p[3] > 0 &&
    p[3] - airport.elevationFt < MAX_HEIGHT_FT &&
    distanceKm(airport.center, [p[1], p[2]]) < MAX_DISTANCE_KM
  );
}

/** Returns flights with estimated landings and takeoffs added where the real data cuts off. */
export function fillMissingEnds(flights: Flight[], airport: Airport): Flight[] {
  return flights.map((f) => {
    const pts = f.points;
    if (pts.length < 2) return f;
    const first = pts[0];
    const last = pts[pts.length - 1];
    const onAirport = (est: Point[]) =>
      est.every(
        (p) => distanceKm(airport.center, [p[1], p[2]]) < MAX_GROUND_KM,
      );
    let before = closeAndLow(first, airport)
      ? takeoff(first, pts[1], airport)
      : [];
    let after = closeAndLow(last, airport)
      ? landing(last, pts[pts.length - 2], airport)
      : [];
    if (!onAirport(before)) before = [];
    if (!onAirport(after)) after = [];
    if (!before.length && !after.length) return f;
    return {
      ...f,
      points: [...before, ...pts, ...after],
      estimatedBefore: before.length ? first[0] : undefined,
      estimatedAfter: after.length ? last[0] : undefined,
    };
  });
}
