import type { Airport } from "../types/airport";
import { ALTITUDE, type Flight, LAT, LON, TIME } from "../types/flight";
import { distanceKm } from "../utils/geo";

const MAX_DISTANCE_KM = 10;
const MAX_HEIGHT_ABOVE_FIELD_FT = 1000;
const MIN_DESCENT_FT = 1500; // must have come down at least this much first (rules out departures)
const MIN_CLIMB_FT = 1000; // then climb at least this much without touching the ground

/**
 * Time of the lowest point of a go-around (aborted landing), or undefined if there was none:
 * an approach that gets low near the field, then climbs away again before touching down.
 */
export function findGoAround(
  flight: Flight,
  airport: Airport,
): number | undefined {
  const points = flight.points;
  let highestAltitude = 0;

  for (let index = 0; index < points.length; index++) {
    const point = points[index];
    if (point[ALTITUDE] === 0) return undefined; // landed first
    highestAltitude = Math.max(highestAltitude, point[ALTITUDE]);

    const isLowOnApproach =
      point[ALTITUDE] - airport.elevationFt < MAX_HEIGHT_ABOVE_FIELD_FT &&
      highestAltitude > point[ALTITUDE] + MIN_DESCENT_FT &&
      distanceKm(airport.center, [point[LON], point[LAT]]) < MAX_DISTANCE_KM;
    if (!isLowOnApproach) continue;

    // From here: track the lowest point until it climbs away (go-around) or touches down (landing).
    let lowestPoint = point;
    for (
      let laterIndex = index + 1;
      laterIndex < points.length && points[laterIndex][ALTITUDE] > 0;
      laterIndex++
    ) {
      const laterPoint = points[laterIndex];
      if (laterPoint[ALTITUDE] < lowestPoint[ALTITUDE])
        lowestPoint = laterPoint;
      else if (laterPoint[ALTITUDE] > lowestPoint[ALTITUDE] + MIN_CLIMB_FT)
        return lowestPoint[TIME];
    }
    return undefined;
  }
  return undefined;
}
