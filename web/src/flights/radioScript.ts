import {
  RADIO_EXCHANGES,
  type RadioPhase,
  type Speaker,
} from "../data/radioPhrases";
import type { Airport } from "../types/airport";
import { ALTITUDE, type Flight, TIME } from "../types/flight";
import { planeAt } from "./planes";
import {
  fillTemplate,
  runwayFromHeading,
  spokenAltitude,
  spokenCallsign,
  spokenHeading,
  stableIndex,
} from "./radio";
import { classifyFlight, type FlightKind } from "./status";

/** Chosen once per page load: the same flight says the same thing while you watch, but differs next visit. */
export const SESSION_SEED = Math.floor(Math.random() * 1_000_000);

/** Seconds between two lines of the same exchange, so a conversation unfolds instead of appearing at once. */
const LINE_GAP_SECONDS = 6;
/** When ATC clears an arrival to land, before touchdown. */
const CLEARED_TO_LAND_SECONDS_BEFORE = 90;
/** When ATC talks to an arrival again after touchdown. */
const AFTER_LANDING_SECONDS = 20;
/** When ATC clears a departure for take-off, before lift-off. */
const CLEARED_FOR_TAKEOFF_SECONDS_BEFORE = 60;
/** When a departure talks to ATC again after lift-off. */
const AFTER_TAKEOFF_SECONDS = 45;
/** Only a plane on the ground this long before lift-off gets a taxi call (not one seen first mid-roll). */
const MIN_TAXI_SECONDS = 120;
/** After a go-around, when ATC starts vectoring the plane back for another approach. */
const REAPPROACH_SECONDS_AFTER_GO_AROUND = 180;
/** How far ahead to look for the altitude a plane climbs to after going around. */
const GO_AROUND_CLIMB_WINDOW_SECONDS = 240;
/** Never start the next exchange before the previous one has had time to finish. */
const MIN_SECONDS_BETWEEN_PHASES = 30;

/** One line of the radio conversation, shown once the replay reaches `time`. */
export interface RadioLine {
  time: number;
  speaker: Speaker;
  text: string;
}

/**
 * The simulated radio conversation of one flight, sorted by time.
 * Arrivals and departures for now; ground moves and overflights stay silent.
 */
export function radioScript(
  flight: Flight,
  airport: Airport,
  seed = SESSION_SEED,
): RadioLine[] {
  const { kind, eventTime } = classifyFlight(flight);
  const phases = phasesFor(
    kind,
    flight.points[0][TIME],
    eventTime,
    flight.goAroundAt,
  );

  // Count repeats (e.g. a second approach after a go-around) so each gets a different variant.
  const occurrences = new Map<RadioPhase, number>();
  return phases
    .flatMap(([phase, time]) => {
      const occurrence = occurrences.get(phase) ?? 0;
      occurrences.set(phase, occurrence + 1);
      return linesForPhase(
        flight,
        airport,
        seed,
        phase,
        time,
        eventTime,
        occurrence,
      );
    })
    .sort((a, b) => a.time - b.time);
}

/**
 * When each radio exchange happens. `eventTime` is touchdown for arrivals and lift-off for
 * departures (see classifyFlight). `goAroundAt` is set when an approach was aborted.
 */
function phasesFor(
  kind: FlightKind,
  firstContact: number,
  eventTime: number,
  goAroundAt?: number,
): [RadioPhase, number][] {
  const notBefore = (earliest: number, time: number) =>
    Math.max(earliest, time);

  // An approach that ends at `endTime`: first contact, then cleared to land 90 s before.
  const approachTo = (endTime: number): [RadioPhase, number][] => [
    ["approach", firstContact],
    [
      "clearedToLand",
      notBefore(
        firstContact + MIN_SECONDS_BETWEEN_PHASES,
        endTime - CLEARED_TO_LAND_SECONDS_BEFORE,
      ),
    ],
  ];

  // Went around: the first approach, the go-around call, and (if it lands later) vectors back.
  if (
    goAroundAt !== undefined &&
    (kind === "arrival" || kind === "overflight")
  ) {
    const firstAttempt: [RadioPhase, number][] = [
      ...approachTo(goAroundAt),
      ["goAround", goAroundAt],
    ];
    if (kind !== "arrival") return firstAttempt; // data ends before it lands again

    const reapproach = goAroundAt + REAPPROACH_SECONDS_AFTER_GO_AROUND;
    return [
      ...firstAttempt,
      ["approach", reapproach],
      [
        "clearedToLand",
        notBefore(
          reapproach + MIN_SECONDS_BETWEEN_PHASES,
          eventTime - CLEARED_TO_LAND_SECONDS_BEFORE,
        ),
      ],
      ["afterLanding", eventTime + AFTER_LANDING_SECONDS],
    ];
  }

  switch (kind) {
    case "arrival":
      return [
        ...approachTo(eventTime),
        ["afterLanding", eventTime + AFTER_LANDING_SECONDS],
      ];
    case "departure": {
      // Seen on the ground long enough to have taxied out? Otherwise start with the take-off.
      const hasTaxied = eventTime - firstContact >= MIN_TAXI_SECONDS;
      const taxiOut: [RadioPhase, number][] = hasTaxied
        ? [["taxiOut", firstContact]]
        : [];
      return [
        ...taxiOut,
        [
          "takeoff",
          notBefore(
            hasTaxied
              ? firstContact + MIN_SECONDS_BETWEEN_PHASES
              : firstContact,
            eventTime - CLEARED_FOR_TAKEOFF_SECONDS_BEFORE,
          ),
        ],
        ["afterTakeoff", eventTime + AFTER_TAKEOFF_SECONDS],
      ];
    }
    default:
      return []; // ground moves and overflights: later
  }
}

/** The lines of one radio exchange, e.g. the "cleared to land" call and its readback. */
function linesForPhase(
  flight: Flight,
  airport: Airport,
  seed: number,
  phase: RadioPhase,
  time: number,
  eventTime: number,
  occurrence: number,
): RadioLine[] {
  // planeAt() is null outside the data, and e.g. touchdown + 20 s can be past the last point:
  // describe the plane as it was at its nearest known moment instead.
  const firstPointTime = flight.points[0][TIME];
  const lastPointTime = flight.points[flight.points.length - 1][TIME];
  const plane = planeAt(
    flight,
    Math.min(Math.max(time, firstPointTime), lastPointTime),
  );
  // The heading at touchdown / lift-off gives the runway, so every phase names the same one.
  const planeAtRunway = planeAt(flight, eventTime);
  if (!plane || !planeAtRunway) return [];

  const values = {
    callsign: spokenCallsign(
      flight.callsign ?? flight.registration ?? flight.icao,
    ),
    airport: airport.name,
    runway: runwayFromHeading(planeAtRunway.heading),
    // After a go-around ATC gives the altitude to climb *to*, not the low point it's at.
    altitude: spokenAltitude(
      phase === "goAround"
        ? goAroundClimbAltitude(flight, time)
        : plane.altitude,
    ),
    heading: spokenHeading(plane.heading),
  };

  const exchanges = RADIO_EXCHANGES[phase];
  // Stable per flight and phase; the second time a phase happens takes the next variant, so a
  // second approach after a go-around never repeats the first one word for word.
  const variant =
    (stableIndex(`${seed}-${flight.icao}-${phase}`, exchanges.length) +
      occurrence) %
    exchanges.length;
  const exchange = exchanges[variant];

  return exchange.map((phrase, index) => ({
    time: time + index * LINE_GAP_SECONDS,
    speaker: phrase.speaker,
    text: fillTemplate(phrase.text, values),
  }));
}

/** The altitude a plane climbs to after going around: its highest point soon after, to 1000 ft. */
function goAroundClimbAltitude(flight: Flight, goAroundAt: number): number {
  const climbOut = flight.points.filter(
    (point) =>
      point[TIME] >= goAroundAt &&
      point[TIME] <= goAroundAt + GO_AROUND_CLIMB_WINDOW_SECONDS,
  );
  const highest = Math.max(0, ...climbOut.map((point) => point[ALTITUDE]));
  return Math.round(highest / 1000) * 1000;
}

/** How long after a line starts we treat the radio as busy (roughly the time to say it). */
const LINE_TALK_SECONDS = LINE_GAP_SECONDS;

/** The lines already said by `time`, oldest first. */
export function linesSoFar(lines: RadioLine[], time: number): RadioLine[] {
  return lines.filter((line) => line.time <= time);
}

/** True while a line is being said at `time`, e.g. to slow the replay down so it can be heard. */
export function isRadioTalking(lines: RadioLine[], time: number): boolean {
  return lines.some(
    (line) => time >= line.time && time < line.time + LINE_TALK_SECONDS,
  );
}

/** Largest time step (s) between two checks that still counts as playing; bigger jumps are slider moves. */
const MAX_PLAYBACK_STEP_SECONDS = 120;

/**
 * The lines the replay just played through, between `previousTime` (exclusive) and `time`.
 * Empty when going backwards or jumping with the slider, so scrubbing never fires a burst.
 */
export function linesPlayedThrough(
  lines: RadioLine[],
  previousTime: number,
  time: number,
): RadioLine[] {
  const isPlayingForward =
    time > previousTime && time - previousTime < MAX_PLAYBACK_STEP_SECONDS;
  if (!isPlayingForward) return [];
  return lines.filter((line) => line.time > previousTime && line.time <= time);
}
