import { useCallback, useEffect, useRef, useState } from "react";
import {
  createRounds,
  type Round,
} from "../arcade/guessDestination/createRounds";
import {
  lastResult,
  rememberResult,
} from "../arcade/guessDestination/dailyPlay";
import {
  type Answer,
  hasPlayed,
  type Result,
  SECONDS_PER_ROUND,
  scoreFor,
  summarise,
} from "../arcade/guessDestination/score";
import { type Flight, type RouteEnd, TIME } from "../types/flight";

/** Replay seconds left when the aircraft reaches the edge of the zone, so it stays visible. */
const STOP_BEFORE_SECONDS = 3;

/** How long the right answer stays on screen before the next question. */
const REVIEW_MILLISECONDS = 1600;
const TICK_MILLISECONDS = 100;

export type GamePhase = "choosing" | "playing" | "reviewing" | "finished";

export interface GuessDestination {
  phase: GamePhase;
  round: Round | null;
  roundNumber: number;
  roundCount: number;
  secondsLeft: number;
  points: number;
  /** The answer just given, while the round is being reviewed. */
  lastAnswer: Answer | null;
  result: Result | null;
  /** Set when today's game is already played, so the dialog shows it instead of starting another. */
  playedToday: Result | null;
  /** True when the day has too few known destinations to ask about, e.g. the sample file. */
  isDayTooQuiet: boolean;
  start: (roundCount: number) => void;
  answer: (picked: RouteEnd) => void;
  /** Leaving half way through doesn't count: the day stays playable. */
  abandon: () => void;
}

interface Options {
  flights: Flight[];
  /** The replayed day; the game is seeded with it, so everyone gets the same questions. */
  date: string | null;
  /** The replay clock, to tell when the aircraft has left the airport's zone. */
  time: number;
  /** Jumps the replay to the flight being asked about. */
  seek: (time: number) => void;
  setPlaying: (isPlaying: boolean) => void;
}

/**
 * The guess-the-destination game: one a day, five to fifteen questions, ten seconds each.
 *
 * The replay jumps to each flight as its question comes up, so the aircraft you are guessing
 * about is the one taking off on the map behind the dialog.
 */
export function useGuessDestination({
  flights,
  date,
  time,
  seek,
  setPlaying,
}: Options): GuessDestination {
  const [phase, setPhase] = useState<GamePhase>("choosing");
  const [rounds, setRounds] = useState<Round[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(SECONDS_PER_ROUND);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [lastAnswer, setLastAnswer] = useState<Answer | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [isDayTooQuiet, setIsDayTooQuiet] = useState(false);

  const stored = useRef<Result | null>(null);
  if (stored.current === null) stored.current = lastResult();
  const playedToday =
    date && hasPlayed(stored.current, date) ? stored.current : null;

  const round = rounds[roundIndex] ?? null;

  const finish = useCallback(
    (given: Answer[]) => {
      const summary = summarise(date ?? "", rounds.length, given);
      stored.current = summary;
      rememberResult(summary);
      setResult(summary);
      setPhase("finished");
    },
    [date, rounds.length],
  );

  const recordAnswer = useCallback(
    (picked: RouteEnd | null) => {
      if (!round) return;
      const isCorrect = picked?.icao === round.flight.destination?.icao;
      const given: Answer = {
        picked,
        isCorrect,
        points: scoreFor(isCorrect, secondsLeft),
      };
      setLastAnswer(given);
      setAnswers((previous) => [...previous, given]);
      setPhase("reviewing");
    },
    [round, secondsLeft],
  );

  // The countdown. Running out counts as an answer nobody gave.
  useEffect(() => {
    if (phase !== "playing") return;
    const timer = setInterval(() => {
      setSecondsLeft((left) => Math.max(0, left - TICK_MILLISECONDS / 1000));
    }, TICK_MILLISECONDS);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === "playing" && secondsLeft <= 0) recordAnswer(null);
  }, [phase, secondsLeft, recordAnswer]);

  // Show the right answer for a moment, then move on (or add up the score).
  useEffect(() => {
    if (phase !== "reviewing") return;
    const timer = setTimeout(() => {
      const isLast = roundIndex >= rounds.length - 1;
      if (isLast) {
        finish(answers);
        return;
      }
      setRoundIndex((index) => index + 1);
      setSecondsLeft(SECONDS_PER_ROUND);
      setLastAnswer(null);
      setPhase("playing");
    }, REVIEW_MILLISECONDS);
    return () => clearTimeout(timer);
  }, [phase, roundIndex, rounds.length, answers, finish]);

  // Each question jumps to the middle of the flight, not its first point: on the ground there is
  // nothing to see, while halfway through the zone the aircraft is climbing out on a heading —
  // which way it turns is the clue. It plays from there.
  // Once per question, not on every tick: re-seeking would fight the pause below.
  const startedRound = useRef(-1);
  useEffect(() => {
    if (phase !== "playing" || !round || startedRound.current === roundIndex) {
      return;
    }
    startedRound.current = roundIndex;
    const points = round.flight.points;
    seek(points[Math.floor(points.length / 2)][TIME]);
    setPlaying(true);
  }, [phase, round, roundIndex, seek, setPlaying]);

  // The aircraft leaves the zone long before the minute is up. Rather than let the replay run on
  // to other traffic, hold it there: the clue is the track it has flown, and it stays on screen.
  const leavesAt = round?.flight.points.at(-1)?.[TIME];
  useEffect(() => {
    if (phase !== "playing" || leavesAt === undefined) return;
    // Stop just short of the last point. A frame past it and the aircraft is outside its own
    // data: it vanishes from the map and the card's altitude and heading go blank. Stopping
    // early keeps it on screen, with no jump backwards.
    if (time >= leavesAt - STOP_BEFORE_SECONDS) setPlaying(false);
  }, [phase, leavesAt, time, setPlaying]);

  const start = useCallback(
    (roundCount: number) => {
      const seed = Number(date?.replaceAll("-", "") ?? 0);
      const game = createRounds(flights, roundCount, seed);
      if (game.length === 0) {
        setIsDayTooQuiet(true);
        return;
      }
      setRounds(game);
      setRoundIndex(0);
      startedRound.current = -1;
      setSecondsLeft(SECONDS_PER_ROUND);
      setAnswers([]);
      setLastAnswer(null);
      setResult(null);
      setPhase("playing");
    },
    [flights, date],
  );

  // Only a finished game is remembered, so closing the dialog half way through costs nothing.
  const abandon = useCallback(() => {
    if (phase === "playing" || phase === "reviewing") {
      setPhase("choosing");
      setRounds([]);
      setAnswers([]);
      setLastAnswer(null);
    }
  }, [phase]);

  return {
    phase,
    round,
    roundNumber: roundIndex + 1,
    roundCount: rounds.length,
    secondsLeft,
    points: answers.reduce((total, given) => total + given.points, 0),
    lastAnswer,
    result,
    playedToday,
    isDayTooQuiet,
    start,
    answer: recordAnswer,
    abandon,
  };
}
