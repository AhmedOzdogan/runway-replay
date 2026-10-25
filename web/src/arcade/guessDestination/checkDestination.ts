import type { Flight } from "../../types/flight";

/**
 * Did the player name the airport this flight actually went to?
 *
 * `destination` is an ICAO code, compared trimmed and upper-cased so a stray space or a lowercase
 * answer still counts. A flight whose destination the pipeline couldn't work out — about 15% of
 * departures, where the aircraft lands after midnight UTC or out of coverage — never matches:
 * there is no right answer, so no answer can be right.
 */
export function checkDestination(flight: Flight, destination: string): boolean {
  if (!destination) return false;
  const targetDestination = flight.destination?.icao;
  if (destination.trim().toUpperCase() === targetDestination) return true;
  return false;
}
