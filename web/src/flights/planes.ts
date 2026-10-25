import {
  ALTITUDE,
  type Flight,
  LAT,
  LON,
  type Plane,
  type Point,
  TIME,
} from "../types/flight";
import { degreesToRadians, distanceKm } from "../utils/geo";

const SECONDS_PER_DAY = 86400;
const KM_PER_NAUTICAL_MILE = 1.852;
// Planes reach their gate at walking pace (under ~15 kt); data that ends faster than that
// means the receiver lost the plane mid-rollout or taxi, so it isn't really parked there.
const MAX_PARKING_SPEED_KNOTS = 15;

/** A stretch of time an aircraft sits still on the ground between flights. */
export interface Parking {
  start: number;
  end: number;
  flight: Flight;
  position: [number, number];
  heading: number;
}

/** Heading in degrees clockwise from north, going from one point to the next. */
function headingBetween(from: Point, to: Point): number {
  const east = (to[LON] - from[LON]) * Math.cos(degreesToRadians(from[LAT]));
  const north = to[LAT] - from[LAT];
  // atan2 gives -180..180; compass headings are 0..359, which is what everything downstream wants.
  const degrees = (Math.atan2(east, north) * 180) / Math.PI;
  return (degrees + 360) % 360;
}

/** Where `flight` is at `time` (linear between points), or null if it isn't in the zone then. */
export function planeAt(flight: Flight, time: number): Plane | null {
  const points = flight.points;
  if (time < points[0][TIME] || time > points[points.length - 1][TIME])
    return null;

  // Binary search for the two points around `time`.
  let beforeIndex = 0;
  let afterIndex = points.length - 1;
  while (afterIndex - beforeIndex > 1) {
    const middleIndex = (beforeIndex + afterIndex) >> 1;
    if (points[middleIndex][TIME] <= time) beforeIndex = middleIndex;
    else afterIndex = middleIndex;
  }
  const previous = points[beforeIndex];
  const next = points[afterIndex];

  const secondsBetween = next[TIME] - previous[TIME];
  // 0 at the previous point, 1 at the next one.
  const progress =
    secondsBetween > 0 ? (time - previous[TIME]) / secondsBetween : 0;
  const between = (from: number, to: number) => from + (to - from) * progress;

  return {
    flight,
    position: [
      between(previous[LON], next[LON]),
      between(previous[LAT], next[LAT]),
    ],
    heading: headingBetween(previous, next),
    altitude: between(previous[ALTITUDE], next[ALTITUDE]),
    speed: speedKnotsBetween(previous, next),
    verticalRate:
      secondsBetween > 0
        ? ((next[ALTITUDE] - previous[ALTITUDE]) / secondsBetween) * 60
        : 0,
    parkedSince: null,
  };
}

function speedKnotsBetween(from: Point, to: Point): number {
  const kmBetween = distanceKm([from[LON], from[LAT]], [to[LON], to[LAT]]);
  const secondsBetween = to[TIME] - from[TIME];
  if (secondsBetween <= 0) return 0;

  const hoursBetween = secondsBetween / 3600;
  return kmBetween / hoursBetween / KM_PER_NAUTICAL_MILE;
}

/**
 * Parked spells: from where a flight stops on the ground until the same aircraft moves again
 * (or the day ends), and from midnight until a first flight that starts on the ground.
 * ponytail: "parked" means the data went quiet on the ground; we don't know it's really at a gate.
 */
export function findParkings(flights: Flight[]): Parking[] {
  const flightsByAircraft = new Map<string, Flight[]>();
  for (const flight of flights) {
    flightsByAircraft.set(flight.icao, [
      ...(flightsByAircraft.get(flight.icao) ?? []),
      flight,
    ]);
  }

  const parkings: Parking[] = [];
  for (const aircraftFlights of flightsByAircraft.values()) {
    aircraftFlights.sort((a, b) => a.points[0][TIME] - b.points[0][TIME]);
    aircraftFlights.forEach((flight, index) => {
      const points = flight.points;
      const first = points[0];
      const last = points[points.length - 1];
      const nextFlight = aircraftFlights[index + 1];
      const endSpeedKnots = speedKnotsBetween(points[points.length - 2], last);
      // Estimated takeoffs/landings start or end on the runway: don't park planes there.
      if (
        index === 0 &&
        first[ALTITUDE] === 0 &&
        flight.estimatedBefore === undefined
      ) {
        parkings.push({
          start: 0,
          end: first[TIME],
          flight,
          position: [first[LON], first[LAT]],
          heading: headingBetween(first, points[1]),
        });
      }
      if (
        last[ALTITUDE] === 0 &&
        flight.estimatedAfter === undefined &&
        endSpeedKnots < MAX_PARKING_SPEED_KNOTS
      ) {
        parkings.push({
          start: last[TIME],
          end: nextFlight?.points[0][TIME] ?? SECONDS_PER_DAY,
          flight,
          position: [last[LON], last[LAT]],
          heading: headingBetween(points[points.length - 2], last),
        });
      }
    });
  }
  return parkings;
}

function parkedPlane(parking: Parking): Plane {
  return {
    flight: parking.flight,
    position: parking.position,
    heading: parking.heading,
    altitude: 0,
    speed: 0,
    verticalRate: 0,
    parkedSince: parking.start,
  };
}

/** Every plane to draw at `time`: parked ones first, then the ones moving. */
export function planesAt(
  flights: Flight[],
  parkings: Parking[],
  time: number,
): Plane[] {
  const planes: Plane[] = [];
  for (const parking of parkings) {
    if (time >= parking.start && time < parking.end)
      planes.push(parkedPlane(parking));
  }
  for (const flight of flights) {
    const plane = planeAt(flight, time);
    if (plane) planes.push(plane);
  }
  return planes;
}

/** The flight of aircraft `icao` closest in time to `time`, e.g. to keep showing its card while it's away. */
export function closestFlight(
  flights: Flight[],
  icao: string,
  time: number,
): Flight | null {
  let closest: Flight | null = null;
  let closestGap = Number.POSITIVE_INFINITY;
  for (const flight of flights) {
    if (flight.icao !== icao) continue;
    const start = flight.points[0][TIME];
    const end = flight.points[flight.points.length - 1][TIME];
    const gap = time < start ? start - time : time > end ? time - end : 0;
    if (gap < closestGap) {
      closest = flight;
      closestGap = gap;
    }
  }
  return closest;
}
