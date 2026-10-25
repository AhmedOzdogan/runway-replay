import type { RouteEnd } from "../../types/flight";

/** How long the player has once a question is on screen. */
export const SECONDS_PER_ROUND = 60;
/** A right answer at the buzzer is still worth something; answering at once is worth the lot. */
const MOST_POINTS = 100;
const POINTS_FOR_ANSWERING = 30;

export interface Answer {
  picked: RouteEnd | null; // null when the clock ran out
  isCorrect: boolean;
  points: number;
}

export interface Result {
  /** The day replayed, so a game belongs to a day rather than to a clock on someone's laptop. */
  date: string;
  rounds: number;
  correct: number;
  points: number;
}

/** 100 points for an instant answer, falling to 30 at the buzzer, 0 for a wrong one. */
export function scoreFor(isCorrect: boolean, secondsLeft: number): number {
  if (!isCorrect) return 0;
  const left = Math.max(0, Math.min(secondsLeft, SECONDS_PER_ROUND));
  const bonus =
    (MOST_POINTS - POINTS_FOR_ANSWERING) * (left / SECONDS_PER_ROUND);
  return Math.round(POINTS_FOR_ANSWERING + bonus);
}

export function summarise(
  date: string,
  rounds: number,
  answers: Answer[],
): Result {
  return {
    date,
    rounds,
    correct: answers.filter((answer) => answer.isCorrect).length,
    points: answers.reduce((total, answer) => total + answer.points, 0),
  };
}

/** One game a day, so the day's flights stay a surprise. */
export function hasPlayed(result: Result | null, date: string): boolean {
  return result !== null && result.date === date;
}
