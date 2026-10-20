import type { Flight, Plane, Point } from "../types/flight";
import { distanceKm } from "../utils/geo";

const DAY = 86400;

export interface Parking {
  from: number;
  to: number;
  flight: Flight;
  position: [number, number];
  heading: number;
}

function headingBetween(a: Point, b: Point): number {
  const dx = (b[1] - a[1]) * Math.cos((a[2] * Math.PI) / 180);
  return (Math.atan2(dx, b[2] - a[2]) * 180) / Math.PI;
}

/** Where `flight` is at `time` (linear between points), or null if it isn't in the zone then. */
export function planeAt(flight: Flight, time: number): Plane | null {
  const pts = flight.points;
  if (time < pts[0][0] || time > pts[pts.length - 1][0]) return null;
  // Binary search for the last point at or before `time`.
  let lo = 0;
  let hi = pts.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (pts[mid][0] <= time) lo = mid;
    else hi = mid;
  }
  const a = pts[lo];
  const b = pts[hi];
  const dt = b[0] - a[0];
  const k = dt > 0 ? (time - a[0]) / dt : 0;
  const km = distanceKm([a[1], a[2]], [b[1], b[2]]);
  return {
    flight,
    position: [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k],
    heading: headingBetween(a, b),
    altitude: a[3] + (b[3] - a[3]) * k,
    speed: dt > 0 ? km / (dt / 3600) / 1.852 : 0,
    verticalRate: dt > 0 ? ((b[3] - a[3]) / dt) * 60 : 0,
    parkedSince: null,
  };
}

/**
 * Parked spells: from where a flight stops on the ground until the same aircraft moves again
 * (or the day ends), and from midnight until a first flight that starts on the ground.
 * ponytail: "parked" means the data went quiet on the ground; we don't know it's really at a gate.
 */
export function findParkings(flights: Flight[]): Parking[] {
  const byAircraft = new Map<string, Flight[]>();
  for (const f of flights)
    byAircraft.set(f.icao, [...(byAircraft.get(f.icao) ?? []), f]);

  const parkings: Parking[] = [];
  for (const list of byAircraft.values()) {
    list.sort((a, b) => a.points[0][0] - b.points[0][0]);
    list.forEach((f, i) => {
      const pts = f.points;
      const first = pts[0];
      const last = pts[pts.length - 1];
      // Estimated takeoffs/landings start or end on the runway: don't park planes there.
      if (i === 0 && first[3] === 0 && f.estimatedBefore === undefined) {
        parkings.push({
          from: 0,
          to: first[0],
          flight: f,
          position: [first[1], first[2]],
          heading: headingBetween(first, pts[1]),
        });
      }
      if (last[3] === 0 && f.estimatedAfter === undefined) {
        parkings.push({
          from: last[0],
          to: list[i + 1]?.points[0][0] ?? DAY,
          flight: f,
          position: [last[1], last[2]],
          heading: headingBetween(pts[pts.length - 2], last),
        });
      }
    });
  }
  return parkings;
}
