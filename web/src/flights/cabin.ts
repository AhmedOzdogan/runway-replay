import { TYPICAL_SEATS } from "../data/names";
import type { Flight } from "../types/flight";

/** Types flown with a cabin of a few seats: who is on board is the clue, not how many. */
const PRIVATE_JETS = new Set([
  "C25A",
  "C525",
  "C55B",
  "C56X",
  "E50P",
  "E550",
  "E55P",
  "GA5C",
  "GL5T",
  "GLEX",
  "GLF5",
  "GLF6",
  "PC12",
  "PC24",
  "PRM1",
]);

/** Freighters carry no passengers at all, so a seat count would be a lie. */
const FREIGHTERS = new Set(["B77L", "B74F", "B744F", "B752F", "MD11", "A332F"]);

/**
 * The cabin, as a spotter would describe it: "~ 180 seats", "private jet", "freighter".
 *
 * Nothing here is from ADS-B — it broadcasts no cabin data — so this is typical capacity by type.
 * Where the type is unknown the emitter category still says something, and where neither does,
 * it says nothing rather than guessing.
 */
export function describeCabin(flight: Flight): string | null {
  const type = flight.type;
  const seats = type ? TYPICAL_SEATS[type] : undefined;

  if (type && FREIGHTERS.has(type)) return "Freighter, no seats";
  if (type && PRIVATE_JETS.has(type)) {
    return seats ? `Private jet, ~ ${seats} seats` : "Private jet";
  }
  if (seats) return `~ ${seats} seats`;

  switch (flight.category) {
    case "A7":
      return "Helicopter";
    case "A1":
      return "Light aircraft";
    case "A5":
      return "Heavy, 250 seats or more";
    default:
      return null;
  }
}
