import {
  TbCheck,
  TbPlaneDeparture,
  TbTargetArrow,
  TbTrophy,
  TbX,
} from "react-icons/tb";
import { SECONDS_PER_ROUND } from "../arcade/guessDestination/score";
import { AIRCRAFT_TYPES, AIRLINES, WEIGHT_CLASSES } from "../data/names";
import { describeCabin } from "../flights/cabin";
import type { GuessDestination } from "../hooks/useGuessDestination";
import { type Plane, TIME } from "../types/flight";
import { formatClockTime, formatFlightTime } from "../utils/format";

const ROUND_COUNTS = [5, 10, 15];
/** Centreline markings on the countdown strip: it is a runway running out. */
const CENTRELINE = Array.from({ length: 10 }, (_, index) => index);

interface GuessDestinationCardProps {
  game: GuessDestination;
  /** Where the aircraft is right now, so the card can show it climbing away. */
  plane: Plane | null;
  airportCode: string;
  onClose: () => void;
}

/**
 * The same airliner the map draws (map/layers.ts), nose up so a rotation points it where it is
 * going. A generic plane icon sits at its own angle and fights the animation.
 */
function PlaneMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M32 2c-2.2 0-4 2.2-4 5v17L6 38v6l22-7v14l-6 5v4l10-3 10 3v-4l-6-5V37l22 7v-6L36 24V7c0-2.8-1.8-5-4-5z"
      />
    </svg>
  );
}

/** One of the clues, as a term and a value. */
function Clue({ label, children }: { label: string; children: string }) {
  return (
    <div>
      <dt className="text-[10px] tracking-wider text-muted uppercase sm:text-[11px]">
        {label}
      </dt>
      <dd className="tabular-nums sm:mt-0.5">{children}</dd>
    </div>
  );
}

/** The countdown drawn as a runway: the strip shortens as the seconds run out. */
function RunwayClock({ secondsLeft }: { secondsLeft: number }) {
  const left = Math.max(0, secondsLeft) / SECONDS_PER_ROUND;
  const isTight = secondsLeft <= 10;
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-night ring-1 ring-line">
        <div
          className={`absolute inset-y-0 left-0 ${isTight ? "bg-amber" : "bg-neon"}`}
          style={{ width: `${left * 100}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-between px-1">
          {CENTRELINE.map((mark) => (
            <span key={mark} className="h-px w-2 bg-night/70" />
          ))}
        </div>
      </div>
      <span
        className={`w-8 text-right text-[13px] font-semibold tabular-nums ${isTight ? "text-amber" : "text-muted"}`}
      >
        {Math.ceil(Math.max(0, secondsLeft))}s
      </span>
    </div>
  );
}

/**
 * The game, in the flight card's place: the map keeps playing behind it and the aircraft you are
 * guessing about is the one being followed. Everything the real card shows is here except the
 * route — that is the question.
 */
export function GuessDestinationCard({
  game,
  plane,
  airportCode,
  onClose,
}: GuessDestinationCardProps) {
  const { phase, round, lastAnswer, playedToday, result } = game;
  const flight = round?.flight;
  const callsign = flight?.callsign ?? flight?.icao.toUpperCase() ?? "";
  const answerIcao = flight?.destination?.icao;
  const cabin = flight ? describeCabin(flight) : null;
  // How long it stayed in the air: the strongest clue of all once you know the aircraft.
  const landedAt = flight?.destination?.at;
  const airborne =
    flight && landedAt !== undefined ? landedAt - flight.points[0][TIME] : null;

  return (
    <aside
      aria-label="Guess the destination"
      className="absolute inset-x-3 bottom-3 z-10 flex max-h-[55%] flex-col rounded-2xl border border-line bg-panel/95 p-3 shadow-card backdrop-blur-sm sm:inset-x-auto sm:top-4 sm:right-4 sm:bottom-auto sm:max-h-[calc(100%-11rem)] sm:w-[min(350px,calc(100vw-32px))] sm:p-4"
    >
      <header className="flex items-start justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] text-neon uppercase">
          <TbTargetArrow size={15} aria-hidden="true" />
          Guess the destination
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Leave the game"
          className="-mt-1 -mr-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-white/5 hover:text-fg"
        >
          <TbX size={16} aria-hidden="true" />
        </button>
      </header>

      {phase === "choosing" && playedToday && (
        <div className="mt-4 text-center">
          <TbTrophy
            size={26}
            aria-hidden="true"
            className="mx-auto text-amber"
          />
          <p className="mt-2 text-2xl font-bold tabular-nums text-neon text-shadow-neon">
            {playedToday.points}
          </p>
          <p className="text-[13px] text-muted">
            {playedToday.correct} of {playedToday.rounds} right today
          </p>
          <p className="mt-4 text-[13px] text-muted">
            One game a day. Come back for tomorrow's flights.
          </p>
        </div>
      )}

      {phase === "choosing" && !playedToday && (
        <div className="mt-3">
          <p className="text-[13px] text-muted">
            Watch a flight leave {airportCode} and say where it's going. A
            minute each, one game a day.
          </p>
          {game.isDayTooQuiet && (
            <p className="mt-3 rounded-lg border border-line bg-night/60 px-2.5 py-2 text-[13px] text-amber">
              Today's data doesn't say where enough flights went. Try another
              airport.
            </p>
          )}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {ROUND_COUNTS.map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => game.start(count)}
                className="group cursor-pointer rounded-xl border border-line bg-night/60 px-2 py-3 transition-colors hover:border-neon"
              >
                <TbPlaneDeparture
                  size={16}
                  aria-hidden="true"
                  className="mx-auto text-muted transition-colors group-hover:text-neon"
                />
                <span className="mt-1.5 block text-xl font-bold tabular-nums text-fg">
                  {count}
                </span>
                <span className="block text-[10px] tracking-widest text-muted uppercase">
                  flights
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {(phase === "playing" || phase === "reviewing") && round && flight && (
        <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="flex items-center justify-between text-[11px] tracking-wider text-muted uppercase">
            <span>
              Flight {game.roundNumber} of {game.roundCount}
            </span>
            <span className="tabular-nums text-fg">{game.points} pts</span>
          </div>

          <div className="mt-0.5 flex items-baseline gap-2 sm:block">
            <span className="text-xl font-bold tracking-wide text-neon text-shadow-neon sm:text-2xl">
              {callsign}
            </span>
            <span className="truncate text-[13px] text-muted sm:block sm:min-h-[1.4em] sm:text-sm">
              {AIRLINES[callsign.slice(0, 3)] ?? ""}
            </span>
          </div>

          {/* What a spotter would go on: the aircraft, how big, how high, and which way. */}
          <dl className="my-2 grid grid-cols-3 gap-x-2 gap-y-1.5 text-[13px] sm:my-3 sm:grid-cols-2 sm:gap-x-3 sm:gap-y-2 sm:text-sm">
            <Clue label="Aircraft">
              {flight.type
                ? (AIRCRAFT_TYPES[flight.type] ?? flight.type)
                : "Unknown"}
            </Clue>
            <Clue label="Class">
              {(flight.category && WEIGHT_CLASSES[flight.category]) ??
                "Unknown"}
            </Clue>
            <Clue label="Cabin">{cabin ?? "—"}</Clue>
            <Clue label="Off at">
              {`${formatClockTime(flight.points[0][TIME])} UTC`}
            </Clue>
            <Clue label="Airborne">
              {airborne === null ? "—" : formatFlightTime(airborne)}
            </Clue>
            <Clue label="Altitude">
              {plane
                ? `${Math.round(plane.altitude).toLocaleString("en")} ft`
                : "—"}
            </Clue>
            <Clue label="Heading">
              {plane ? `${Math.round(plane.heading)}°` : "—"}
            </Clue>
          </dl>

          <RunwayClock secondsLeft={game.secondsLeft} />

          <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:mt-3 sm:grid-cols-1 sm:gap-2">
            {round.options.map((option) => {
              const isAnswer = option.icao === answerIcao;
              const isPicked = lastAnswer?.picked?.icao === option.icao;
              const shown =
                phase === "reviewing" && isAnswer
                  ? "border-neon bg-neon/10 text-neon motion-safe:animate-win-pulse"
                  : phase === "reviewing" && isPicked
                    ? "border-amber bg-amber/10 text-amber motion-safe:animate-miss-shake"
                    : "border-line hover:border-muted";
              return (
                <button
                  key={option.icao}
                  type="button"
                  disabled={phase === "reviewing"}
                  onClick={() => game.answer(option)}
                  className={`relative flex cursor-pointer items-center justify-between gap-1.5 overflow-hidden rounded-xl border bg-night/40 px-2.5 py-1.5 text-left transition-colors disabled:cursor-default sm:gap-2 sm:px-3 sm:py-2 ${shown}`}
                >
                  {phase === "reviewing" && isAnswer && (
                    // The answer is revealed as a departure: light down the runway, a contrail,
                    // and the aircraft rotating as it climbs out of the row.
                    <>
                      {/* Runway light and contrail pass behind the city name… */}
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl motion-reduce:hidden"
                      >
                        <span className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-neon/25 to-transparent motion-safe:animate-sweep" />
                        <span className="absolute bottom-[30%] left-0 h-px w-full origin-left bg-gradient-to-r from-neon/0 via-neon/70 to-neon/0 motion-safe:animate-contrail" />
                      </span>
                      {/* …the aircraft flies over it, hiding the letters it covers. */}
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-xl motion-reduce:hidden"
                      >
                        <span className="absolute motion-safe:animate-takeoff">
                          <span className="absolute -inset-2 rounded-full bg-night/85 blur-[6px]" />
                          <PlaneMark className="relative size-6 text-neon drop-shadow-[0_0_8px_#22d3eeaa]" />
                        </span>
                      </span>
                    </>
                  )}
                  <span className="truncate font-semibold">{option.city}</span>
                  <span className="hidden shrink-0 items-center gap-1.5 text-[11px] tracking-widest text-muted sm:flex">
                    {option.icao}
                    {phase === "reviewing" && isAnswer && (
                      <TbCheck
                        size={13}
                        aria-hidden="true"
                        className="text-neon"
                      />
                    )}
                    {phase === "reviewing" && isPicked && !isAnswer && (
                      <TbX
                        size={13}
                        aria-hidden="true"
                        className="text-amber"
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <p
            aria-live="polite"
            className="mt-2 min-h-[1.25rem] text-center text-[13px]"
          >
            {phase === "reviewing" &&
              (lastAnswer?.isCorrect ? (
                <span className="text-neon">
                  Correct · +{lastAnswer.points}
                </span>
              ) : (
                <span className="text-muted">
                  {lastAnswer?.picked ? "No" : "Out of time"} · it went to{" "}
                  {flight.destination?.city}
                </span>
              ))}
          </p>
        </div>
      )}

      {phase === "finished" && result && (
        <div className="mt-4 text-center">
          <TbTrophy
            size={26}
            aria-hidden="true"
            className="mx-auto text-amber"
          />
          <p className="mt-2 text-3xl font-bold tabular-nums text-neon text-shadow-neon">
            {result.points}
          </p>
          <p className="text-[13px] text-muted">
            {result.correct} of {result.rounds} right
          </p>
          <p className="mt-4 text-[13px] text-muted">
            That's today's game. Tomorrow brings new flights.
          </p>
        </div>
      )}
    </aside>
  );
}
