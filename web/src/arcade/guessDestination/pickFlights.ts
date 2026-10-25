import { isGroundVehicle } from "../../flights/vehicle";
import { type Flight, TIME } from "../../types/flight";
import { SESSION_SEED, stableRank } from "../../utils/stable";

/**
 * The flights a quiz round can be built from, in the order they'll be played.
 *
 * `seed` keeps the choice stable: the replay re-renders 60×/s, so picking with Math.random would
 * reshuffle the game on every frame. Same seed, same game; SESSION_SEED varies it between visits.
 */

export function pickFlights(
  flightList: Flight[],
  count: number = 5,
  seed: number = SESSION_SEED,
): Flight[] {
  const playableList = playable(flightList);

  const ranked = playableList
    .map((flight) => ({
      flight,
      rank: stableRank(`${seed}-${flight.icao}-${flight.points[0][TIME]}`),
    }))
    .sort((first, second) => first.rank - second.rank)
    .slice(0, count);

  return ranked.map(({ flight }) => flight);
}

/** A round needs a right answer,
 * so only departures with a known destination can be picked.
 */
export function playable(flights: Flight[]): Flight[] {
  return flights.filter(
    (flight) => flight.destination && !isGroundVehicle(flight),
  );
}
