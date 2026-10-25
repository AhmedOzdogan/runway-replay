import type { RouteEnd } from "../../types/flight";
import { SESSION_SEED, stableRank } from "../../utils/stable";

/**
 * The places to offer for one round: `count` of them, one being where the flight really went.
 *
 * The wrong ones are other destinations from the same day, so they are plausible — guessing
 * between Hamburg, Düsseldorf and Berlin is a question; guessing against Ulaanbaatar is not.
 * Everything is ranked from `seed` rather than shuffled, so the options (and the answer's
 * position) stay put while the replay re-renders.
 */
export function pickOptions(
  answer: RouteEnd,
  destinations: RouteEnd[],
  count = 4,
  seed = SESSION_SEED,
): RouteEnd[] {
  // Two airports can serve one city (London has EGLL and EGKK): two buttons saying "London"
  // would have no right answer, so a city appears at most once.
  const seen = new Set([answer.city]);
  const candidates = destinations.filter((place) => {
    if (seen.has(place.city)) return false;
    seen.add(place.city);
    return true;
  });

  const wrong = candidates
    .map((place) => ({
      place,
      rank: stableRank(`${seed}-${answer.icao}-${place.icao}`),
    }))
    .sort((first, second) => first.rank - second.rank)
    .slice(0, count - 1)
    .map(({ place }) => place);

  // Rank again to place the answer: otherwise it would always sit in the same slot.
  return [answer, ...wrong].sort(
    (first, second) =>
      stableRank(`${seed}-slot-${first.icao}`) -
      stableRank(`${seed}-slot-${second.icao}`),
  );
}
