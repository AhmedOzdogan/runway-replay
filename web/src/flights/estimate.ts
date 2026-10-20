import type { Airport } from "../types/airport";
import {
  ALTITUDE,
  type Flight,
  LAT,
  LON,
  type Point,
  TIME,
} from "../types/flight";
import {
  degreesToRadians,
  distanceKm,
  KM_PER_DEGREE_LAT,
  KM_PER_DEGREE_LON_AT_EQUATOR,
} from "../utils/geo";

// Receivers often lose aircraft in the last few hundred feet, so arrivals vanish just above the
// runway and departures pop up already climbing. These fill in the missing bit with a simple
// physical estimate. ponytail: straight line along the first/last heading, so only on short final
// or initial climb, where that line is the runway.
const MAX_DISTANCE_KM = 6;
const MAX_HEIGHT_ABOVE_FIELD_FT = 1500;
const MAX_RUNWAY_DISTANCE_KM = 5; // estimated runway points further out than this are wrong: skip them
const GLIDE_SLOPE = Math.tan(degreesToRadians(3)); // standard 3° approach
const CLIMB_GRADIENT = 0.15; // ~9° initial climb
const LANDING_ROLLOUT_KM = 1.5;
const TAKEOFF_ROLL_KM = 2;
const MIN_APPROACH_SPEED_KNOTS = 110;
const MIN_LIFTOFF_SPEED_KNOTS = 130;
const TAXI_SPEED_KNOTS = 20;
const KM_PER_FOOT = 0.0003048;
const KM_PER_SECOND_PER_KNOT = 1.852 / 3600;
const POINTS_PER_ROLL = 6;

/** Speed in knots and heading in radians (clockwise from north) going from one point to the next. */
function speedAndHeading(
  from: Point,
  to: Point,
): { knots: number; heading: number } {
  const eastKm =
    (to[LON] - from[LON]) *
    KM_PER_DEGREE_LON_AT_EQUATOR *
    Math.cos(degreesToRadians(from[LAT]));
  const northKm = (to[LAT] - from[LAT]) * KM_PER_DEGREE_LAT;
  const seconds = Math.abs(to[TIME] - from[TIME]);
  return {
    knots:
      seconds > 0
        ? Math.hypot(eastKm, northKm) / seconds / KM_PER_SECOND_PER_KNOT
        : 0,
    heading: Math.atan2(eastKm, northKm),
  };
}

/** The [longitude, latitude] reached by going `km` from a position along `heading` (radians). */
function moveAlongHeading(
  lon: number,
  lat: number,
  heading: number,
  km: number,
): [number, number] {
  const kmPerDegreeLon =
    KM_PER_DEGREE_LON_AT_EQUATOR * Math.cos(degreesToRadians(lat));
  return [
    lon + (km * Math.sin(heading)) / kmPerDegreeLon,
    lat + (km * Math.cos(heading)) / KM_PER_DEGREE_LAT,
  ];
}

/** Same rounding as the pipeline: whole seconds and feet, ~11 m for positions. */
function roundPoint(point: Point): Point {
  return [
    Math.round(point[TIME]),
    Math.round(point[LON] * 1e4) / 1e4,
    Math.round(point[LAT] * 1e4) / 1e4,
    Math.round(point[ALTITUDE]),
  ];
}

/** Glide down from the last point to the runway, roll out to taxi speed, then end. */
function estimateLanding(
  last: Point,
  previous: Point,
  airport: Airport,
): Point[] {
  const { knots, heading } = speedAndHeading(previous, last);
  const speed =
    Math.max(knots, MIN_APPROACH_SPEED_KNOTS) * KM_PER_SECOND_PER_KNOT; // km/s
  const heightAboveField = Math.max(0, last[ALTITUDE] - airport.elevationFt);
  const glideKm = (heightAboveField * KM_PER_FOOT) / GLIDE_SLOPE;
  const [touchdownLon, touchdownLat] = moveAlongHeading(
    last[LON],
    last[LAT],
    heading,
    glideKm,
  );
  const touchdownTime = last[TIME] + glideKm / speed;
  const points: Point[] = [[touchdownTime, touchdownLon, touchdownLat, 0]];

  // Constant deceleration from landing speed to taxi speed over the rollout distance.
  const taxiSpeed = TAXI_SPEED_KNOTS * KM_PER_SECOND_PER_KNOT;
  const deceleration =
    (speed * speed - taxiSpeed * taxiSpeed) / (2 * LANDING_ROLLOUT_KM);
  const rolloutSeconds = (speed - taxiSpeed) / deceleration;
  for (let step = 1; step <= POINTS_PER_ROLL; step++) {
    const secondsSinceTouchdown = (rolloutSeconds * step) / POINTS_PER_ROLL;
    const kmRolled =
      speed * secondsSinceTouchdown -
      0.5 * deceleration * secondsSinceTouchdown ** 2;
    const [lon, lat] = moveAlongHeading(
      touchdownLon,
      touchdownLat,
      heading,
      kmRolled,
    );
    points.push([touchdownTime + secondsSinceTouchdown, lon, lat, 0]);
  }
  return points.map(roundPoint);
}

/** Start standing on the runway, accelerate, lift off, and climb to the first real point. */
function estimateTakeoff(first: Point, next: Point, airport: Airport): Point[] {
  const { knots, heading } = speedAndHeading(first, next);
  const speed =
    Math.max(knots, MIN_LIFTOFF_SPEED_KNOTS) * KM_PER_SECOND_PER_KNOT; // km/s
  const backwards = heading + Math.PI;
  const heightAboveField = Math.max(0, first[ALTITUDE] - airport.elevationFt);
  const climbKm = (heightAboveField * KM_PER_FOOT) / CLIMB_GRADIENT;
  const [liftoffLon, liftoffLat] = moveAlongHeading(
    first[LON],
    first[LAT],
    backwards,
    climbKm,
  );
  const liftoffTime = first[TIME] - climbKm / speed;

  // Constant acceleration from standstill to liftoff speed over the takeoff roll.
  const rollSeconds = (2 * TAKEOFF_ROLL_KM) / speed;
  const acceleration = speed / rollSeconds;
  const points: Point[] = [];
  for (let step = 0; step < POINTS_PER_ROLL; step++) {
    const secondsSinceBrakeRelease = (rollSeconds * step) / POINTS_PER_ROLL;
    const kmToLiftoff =
      TAKEOFF_ROLL_KM - 0.5 * acceleration * secondsSinceBrakeRelease ** 2;
    const [lon, lat] = moveAlongHeading(
      liftoffLon,
      liftoffLat,
      backwards,
      kmToLiftoff,
    );
    points.push([
      liftoffTime - rollSeconds + secondsSinceBrakeRelease,
      lon,
      lat,
      0,
    ]);
  }
  points.push([liftoffTime, liftoffLon, liftoffLat, 0]);
  return points.filter((point) => point[TIME] >= 0).map(roundPoint);
}

function isLowNearAirport(point: Point, airport: Airport): boolean {
  return (
    point[ALTITUDE] > 0 &&
    point[ALTITUDE] - airport.elevationFt < MAX_HEIGHT_ABOVE_FIELD_FT &&
    distanceKm(airport.center, [point[LON], point[LAT]]) < MAX_DISTANCE_KM
  );
}

/** Returns flights with estimated landings and takeoffs added where the real data cuts off. */
export function fillMissingEnds(flights: Flight[], airport: Airport): Flight[] {
  const staysOnAirport = (estimatedPoints: Point[]) =>
    estimatedPoints.every(
      (point) =>
        distanceKm(airport.center, [point[LON], point[LAT]]) <
        MAX_RUNWAY_DISTANCE_KM,
    );

  return flights.map((flight) => {
    const points = flight.points;
    if (points.length < 2) return flight;
    const first = points[0];
    const last = points[points.length - 1];

    let takeoffPoints = isLowNearAirport(first, airport)
      ? estimateTakeoff(first, points[1], airport)
      : [];
    let landingPoints = isLowNearAirport(last, airport)
      ? estimateLanding(last, points[points.length - 2], airport)
      : [];
    if (!staysOnAirport(takeoffPoints)) takeoffPoints = [];
    if (!staysOnAirport(landingPoints)) landingPoints = [];
    if (!takeoffPoints.length && !landingPoints.length) return flight;

    return {
      ...flight,
      points: [...takeoffPoints, ...points, ...landingPoints],
      estimatedBefore: takeoffPoints.length ? first[TIME] : undefined,
      estimatedAfter: landingPoints.length ? last[TIME] : undefined,
    };
  });
}
