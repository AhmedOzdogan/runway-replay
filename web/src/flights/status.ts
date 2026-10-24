import { ALTITUDE, type Flight, type Plane, TIME } from "../types/flight";
import { formatClockTime, formatDuration } from "../utils/format";

const GO_AROUND_MESSAGE_SECONDS = 90;
/** Feet per minute above which a plane counts as climbing / descending. */
export const VERTICAL_RATE_THRESHOLD = 300;

export type FlightKind = "arrival" | "departure" | "ground" | "overflight";

/** Whether the flight lands, takes off, only taxis or passes by, and when it touches down / lifts off. */
export function classifyFlight(flight: Flight): {
  kind: FlightKind;
  eventTime: number;
} {
  const points = flight.points;
  const startsOnGround = points[0][ALTITUDE] === 0;
  const endsOnGround = points[points.length - 1][ALTITUDE] === 0;

  if (endsOnGround && !startsOnGround) {
    // Touchdown is the first point of the final stretch on the ground.
    let touchdownIndex = points.length - 1;
    while (touchdownIndex > 0 && points[touchdownIndex - 1][ALTITUDE] === 0)
      touchdownIndex--;
    return { kind: "arrival", eventTime: points[touchdownIndex][TIME] };
  }
  if (startsOnGround && !endsOnGround) {
    const liftoff = points.find((point) => point[ALTITUDE] > 0);
    return { kind: "departure", eventTime: liftoff?.[TIME] ?? points[0][TIME] };
  }
  return {
    kind: startsOnGround ? "ground" : "overflight",
    eventTime: points[0][TIME],
  };
}

/** Origin and destination as far as we know them: only the selected airport, "?" otherwise. */
export function routeEnds(
  flight: Flight,
  airportCode: string,
): { from: string; to: string } {
  const { kind } = classifyFlight(flight);
  const here = kind === "departure" || kind === "ground";
  const there = kind === "arrival" || kind === "ground";
  return {
    from: here ? airportCode : (flight.origin?.icao ?? "?"),
    to: there ? airportCode : (flight.destination?.icao ?? "?"),
  };
}

/** One-line status for the flight card, e.g. "On approach · lands in 3 min". */
export function describeStatus(plane: Plane, time: number): string {
  if (plane.parkedSince !== null) {
    return plane.parkedSince === 0
      ? "Parked"
      : `Parked · ${formatDuration(time - plane.parkedSince)}`;
  }

  const goAroundAt = plane.flight.goAroundAt;
  const goAroundDone = goAroundAt !== undefined && time >= goAroundAt;
  const goAroundAhead = goAroundAt !== undefined && time < goAroundAt;
  if (goAroundDone && time < goAroundAt + GO_AROUND_MESSAGE_SECONDS)
    return "GO AROUND!";
  const wentAroundPrefix = goAroundDone
    ? `Went around at ${formatClockTime(goAroundAt)} · `
    : "";

  const { kind, eventTime } = classifyFlight(plane.flight);
  if (kind === "arrival") {
    // Don't count down to a landing that comes after a go-around the plane hasn't flown yet.
    if (goAroundAhead) return "On approach";
    if (time >= eventTime)
      return `Landed ${formatDuration(time - eventTime)} ago · taxiing`;
    const landsIn = `lands in ${formatDuration(eventTime - time)}`;
    return wentAroundPrefix
      ? wentAroundPrefix + landsIn
      : `On approach · ${landsIn}`;
  }
  if (kind === "departure") {
    return time < eventTime
      ? `Taxiing · takes off in ${formatDuration(eventTime - time)}`
      : `Took off ${formatDuration(time - eventTime)} ago`;
  }
  if (kind === "ground") return "Taxiing";
  if (goAroundAhead) return "On approach";
  if (wentAroundPrefix) return `${wentAroundPrefix}climbing away`;
  if (plane.verticalRate > VERTICAL_RATE_THRESHOLD)
    return "Passing by · climbing";
  if (plane.verticalRate < -VERTICAL_RATE_THRESHOLD)
    return "Passing by · descending";
  return "Passing by";
}

/** True while the plane is on a part of its path we estimated (see estimate.ts). */
export function isOnEstimatedPart(plane: Plane, time: number): boolean {
  const { estimatedBefore, estimatedAfter } = plane.flight;
  return (
    plane.parkedSince === null &&
    ((estimatedBefore !== undefined && time < estimatedBefore) ||
      (estimatedAfter !== undefined && time > estimatedAfter))
  );
}

/** True for a few minutes after a go-around, to highlight the plane. */
export function isGoingAround(
  flight: Flight,
  time: number,
  highlightSeconds = 180,
): boolean {
  return (
    flight.goAroundAt !== undefined &&
    time >= flight.goAroundAt &&
    time < flight.goAroundAt + highlightSeconds
  );
}
