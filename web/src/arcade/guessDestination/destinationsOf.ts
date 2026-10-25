import type { Flight, RouteEnd } from "../../types/flight";
import { playable } from "./pickFlights";

/**
 * Every place today's flights went, one entry per city, in the order they first appear.
 *
 * A day is around 1,600 flights but only ~130 destinations (Munich 126, Heathrow 122,
 * Amsterdam 162 on 2026-10-22), so the rounds draw their wrong answers from this list instead of
 * walking the whole day each time. One entry per city: two buttons saying "London" would leave a
 * round with no single right answer.
 */
export function destinationsOf(flights: Flight[]): RouteEnd[] {
  const byCity = new Map<string, RouteEnd>();
  for (const flight of playable(flights)) {
    const destination = flight.destination;
    if (destination && !byCity.has(destination.city)) {
      byCity.set(destination.city, destination);
    }
  }
  return [...byCity.values()];
}
