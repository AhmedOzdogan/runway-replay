import type { Airport } from "./airports";
import { distanceKm } from "./replay";
import type { Flight } from "./types";

const NEAR_KM = 10;
const LOW_FT = 1000; // above the field
const DESCENDED_FT = 1500; // must have come down at least this much first (rules out departures)
const CLIMB_FT = 1000; // then climb at least this much without touching the ground

/**
 * Time of the lowest point of a go-around (aborted landing), or undefined if there was none:
 * an approach that gets low near the field, then climbs away again before touching down.
 */
export function findGoAround(
  flight: Flight,
  airport: Airport,
): number | undefined {
  const pts = flight.points;
  let highest = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (p[3] === 0) return undefined; // landed first
    highest = Math.max(highest, p[3]);
    const low =
      p[3] - airport.elevationFt < LOW_FT &&
      highest > p[3] + DESCENDED_FT &&
      distanceKm(airport.center, [p[1], p[2]]) < NEAR_KM;
    if (!low) continue;
    // From here: track the lowest point until it climbs away (go-around) or touches down (landing).
    let lowest = p;
    for (let j = i + 1; j < pts.length && pts[j][3] > 0; j++) {
      if (pts[j][3] < lowest[3]) lowest = pts[j];
      else if (pts[j][3] > lowest[3] + CLIMB_FT) return lowest[0];
    }
    return undefined;
  }
  return undefined;
}
