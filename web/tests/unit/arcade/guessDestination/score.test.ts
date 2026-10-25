import { describe, expect, it } from "vitest";
import {
  type Answer,
  hasPlayed,
  SECONDS_PER_ROUND,
  scoreFor,
  summarise,
} from "../../../../src/arcade/guessDestination/score";

const HAMBURG = { icao: "EDDH", city: "Hamburg" };

function answer(isCorrect: boolean, points: number): Answer {
  return { picked: isCorrect ? HAMBURG : null, isCorrect, points };
}

describe("scoreFor", () => {
  it("pays most for answering at once", () => {
    expect(scoreFor(true, SECONDS_PER_ROUND)).toBe(100);
  });

  it("still pays something at the buzzer", () => {
    expect(scoreFor(true, 0)).toBe(30);
  });

  it("pays less the longer it takes", () => {
    expect(scoreFor(true, 8)).toBeGreaterThan(scoreFor(true, 3));
  });

  it("pays nothing for a wrong answer, however fast", () => {
    expect(scoreFor(false, SECONDS_PER_ROUND)).toBe(0);
  });

  it("ignores a clock outside the round", () => {
    expect(scoreFor(true, 99)).toBe(100);
    expect(scoreFor(true, -5)).toBe(30);
  });
});

describe("summarise", () => {
  it("counts the right answers and adds up the points", () => {
    const result = summarise("2026-10-24", 3, [
      answer(true, 90),
      answer(false, 0),
      answer(true, 40),
    ]);
    expect(result).toEqual({
      date: "2026-10-24",
      rounds: 3,
      correct: 2,
      points: 130,
    });
  });

  it("handles a game nobody answered", () => {
    expect(summarise("2026-10-24", 2, []).points).toBe(0);
  });
});

describe("hasPlayed", () => {
  const result = { date: "2026-10-24", rounds: 5, correct: 3, points: 240 };

  it("is true for the day already played", () => {
    expect(hasPlayed(result, "2026-10-24")).toBe(true);
  });

  it("is false for another day, and for a first visit", () => {
    expect(hasPlayed(result, "2026-10-25")).toBe(false);
    expect(hasPlayed(null, "2026-10-24")).toBe(false);
  });
});
