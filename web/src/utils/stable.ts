/**
 * Repeatable "randomness". The replay re-renders 60×/s, so anything picked with Math.random would
 * change on every frame: these turn a key into the same number every time instead.
 */

/** Pick one of `count` options from `seed`, e.g. which radio phrasing a flight uses. */
export function stableIndex(seed: string, count: number): number {
  return hashOf(seed) % count;
}

/** Chosen once per page load: the same flight says the same thing while you watch, but differs next visit. */
export const SESSION_SEED = Math.floor(Math.random() * 1_000_000);

/**
 * A number to sort by, for choosing some of a list rather than one of a few options.
 *
 * `stableIndex` can't do this job: its hash barely moves between similar keys, so sorting by it
 * sorts almost by ICAO address, and a seed written as a prefix shifts every key by the same
 * amount, leaving the order identical. The extra mixing here spreads neighbouring keys apart.
 */
export function stableRank(key: string): number {
  let hash = hashOf(key);
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 2246822507) >>> 0;
  hash ^= hash >>> 13;
  return hash >>> 0;
}

function hashOf(text: string): number {
  let hash = 0;
  for (const character of text) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash;
}
