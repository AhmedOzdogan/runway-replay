import type { Flight, RouteEnd } from "../../types/flight";
import { SESSION_SEED } from "../../utils/stable";
import { destinationsOf } from "./destinationsOf";
import { pickFlights } from "./pickFlights";
import { pickOptions } from "./pickOptions";

/** Four buttons: one right answer and three plausible wrong ones. */
const OPTIONS_PER_ROUND = 4;

/** One question: a flight that left here, and the places it might have been going. */
export interface Round {
  flight: Flight;
  options: RouteEnd[];
}

/**
 * Build a game from one day: `count` flights, each with four places to choose from.
 *
 * The wrong answers come from the whole day (~130 destinations), not from the picked flights, so
 * they are plausible without being each other's answers. Everything follows `seed`, so the same
 * day and seed give the same game — and nothing reshuffles while the replay re-renders.
 */
export function createRounds(
  flights: Flight[],
  count: number = 5,
  seed = SESSION_SEED,
): Round[] {
  const createdRounds: Round[] = [];
  const pickedFlights: Flight[] = pickFlights(flights, count, seed);
  const destinations: RouteEnd[] = destinationsOf(flights);

  for (const flight of pickedFlights) {
    // pickFlights only returns flights that went somewhere; this tells the compiler so.
    const answer = flight.destination;
    if (!answer) continue;

    const options: RouteEnd[] = pickOptions(
      answer,
      destinations,
      OPTIONS_PER_ROUND,
      seed,
    );
    createdRounds.push({ flight, options });
  }
  return createdRounds;
}
