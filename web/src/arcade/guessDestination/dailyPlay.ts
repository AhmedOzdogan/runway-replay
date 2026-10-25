import type { Result } from "./score";

const STORAGE_KEY = "runway-replay.guess-destination";

/**
 * The last game's result, kept in the browser. Reading can throw (private mode, blocked storage),
 * and failing to remember must never stop someone playing, so both sides swallow errors.
 */
export function lastResult(): Result | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Result) : null;
  } catch {
    return null;
  }
}

export function rememberResult(result: Result): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  } catch {
    // Not being able to remember is not a reason to lose the game you just played.
  }
}
