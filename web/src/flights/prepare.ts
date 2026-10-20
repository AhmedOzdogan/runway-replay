import type { Airport } from "../types/airport";
import type { Flight } from "../types/flight";
import { fillMissingEnds } from "./estimate";
import { findGoAround } from "./goAround";

/** Everything the browser adds to a loaded day: go-arounds first (on real data), then estimated ends. */
export function prepareFlights(flights: Flight[], airport: Airport): Flight[] {
  const withGoArounds = flights.map((flight) => {
    const goAroundAt = findGoAround(flight, airport);
    return goAroundAt === undefined ? flight : { ...flight, goAroundAt };
  });
  return fillMissingEnds(withGoArounds, airport);
}
