import { type ReactNode, useState } from "react";
import { AIRCRAFT_TYPES, AIRLINES } from "../data/names";
import type { RadioLine } from "../flights/radioScript";
import {
  describeStatus,
  isOnEstimatedPart,
  routeEnds,
  VERTICAL_RATE_THRESHOLD,
} from "../flights/status";
import type { RadioVoice } from "../hooks/useRadioVoice";
import type { Airport } from "../types/airport";
import type { Flight, Plane } from "../types/flight";
import { distanceKm } from "../utils/geo";
import { RadioTranscript } from "./RadioTranscript";

const COMPASS_DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const KM_PER_NAUTICAL_MILE = 1.852;

interface FlightCardProps {
  flight: Flight;
  /** null when the aircraft isn't near the airport at `time`. */
  plane: Plane | null;
  time: number;
  airportCode: string;
  airport: Airport;
  isFollowing: boolean;
  /** Radio lines said so far for this flight. */
  radioLines: RadioLine[];
  radioVoice: Pick<
    RadioVoice,
    | "status"
    | "progress"
    | "loadStage"
    | "errorMessage"
    | "readyLineKeys"
    | "spokenLineKeys"
    | "toggle"
  >;
  onFollowChange: (isFollowing: boolean) => void;
  onClose: () => void;
}

function LabelledValue({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt className="text-[11px] tracking-wider text-muted uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 tabular-nums">{children}</dd>
    </div>
  );
}

function formatAltitude(plane: Plane): string {
  if (plane.altitude <= 0) return "On ground";
  const trendArrow =
    plane.verticalRate > VERTICAL_RATE_THRESHOLD
      ? " ↑"
      : plane.verticalRate < -VERTICAL_RATE_THRESHOLD
        ? " ↓"
        : "";
  return `${Math.round(plane.altitude).toLocaleString("en")} ft${trendArrow}`;
}

function formatHeading(heading: number): string {
  const degrees = (Math.round(heading) + 360) % 360;
  return `${degrees}° ${COMPASS_DIRECTIONS[Math.round(degrees / 45) % 8]}`;
}

type CardTab = "info" | "radio";

/** One of the two phone tabs. On desktop both panels are shown at once and these aren't rendered. */
function TabButton({
  tab,
  selected,
  onSelect,
  children,
}: {
  tab: CardTab;
  selected: boolean;
  onSelect: (tab: CardTab) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`flight-card-tab-${tab}`}
      aria-selected={selected}
      aria-controls={`flight-card-panel-${tab}`}
      onClick={() => onSelect(tab)}
      className="flex-1 cursor-pointer border-b-2 border-transparent pb-1.5 text-[13px] tracking-wide text-muted aria-selected:border-neon aria-selected:text-neon"
    >
      {children}
    </button>
  );
}

/** Info card for the selected aircraft; re-renders every frame while the replay plays. */
export function FlightCard({
  flight,
  plane,
  time,
  airportCode,
  airport,
  isFollowing,
  radioLines,
  radioVoice,
  onFollowChange,
  onClose,
}: FlightCardProps) {
  // Phones show one panel at a time so the card can't grow past the map; desktop shows both.
  const [tab, setTab] = useState<CardTab>("info");
  const callsign = flight.callsign ?? flight.icao.toUpperCase();
  const { from, to } = routeEnds(flight, airportCode);
  const status = plane
    ? describeStatus(plane, time) +
      (isOnEstimatedPart(plane, time) ? " · estimated" : "")
    : `Not near ${airportCode} at this time`;

  return (
    <aside
      aria-live="polite"
      // Sized against the map area, not the viewport: mobile Chrome's vh units assume the URL bar
      // is hidden, which pushed the card into the time bar. The reserved space is the time bar.
      className="absolute top-4 right-4 z-10 flex max-h-[calc(100%-9rem)] w-[min(350px,calc(100vw-32px))] flex-col rounded-2xl border border-line bg-panel/95 p-4 shadow-card backdrop-blur-sm sm:max-h-[calc(100%-11rem)]"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute top-2.5 right-2.5 size-7 cursor-pointer rounded-full border bg-muted border-line text-lg leading-none"
      >
        ×
      </button>
      <div className="text-2xl font-bold tracking-wide text-neon text-shadow-neon">
        {callsign}
      </div>
      <div className="min-h-[1.4em] text-muted">
        {AIRLINES[callsign.slice(0, 3)] ?? ""}
      </div>
      <div className="my-2.5 inline-block rounded-full bg-neon/10 px-2.5 py-0.5 text-[13px] text-neon">
        {status}
      </div>

      <div
        role="tablist"
        aria-label="Flight details"
        className="mb-3 flex gap-4 border-b border-line sm:hidden"
      >
        <TabButton tab="info" selected={tab === "info"} onSelect={setTab}>
          Flight
        </TabButton>
        <TabButton tab="radio" selected={tab === "radio"} onSelect={setTab}>
          Radio
          {radioLines.length > 0 && tab !== "radio" && (
            <span className="ml-1.5 inline-block size-1.5 rounded-full bg-neon align-middle shadow-neon" />
          )}
        </TabButton>
      </div>

      <div
        role="tabpanel"
        id="flight-card-panel-info"
        aria-labelledby="flight-card-tab-info"
        className={`${tab === "info" ? "block" : "hidden"} min-h-0 flex-1 overflow-y-auto sm:block`}
      >
        <div className="flex items-center justify-between text-xl font-semibold tracking-wider">
          <span>{from}</span>
          <span className="mx-2.5 flex-1 border-b border-dashed border-line text-center text-sm leading-[0.1] text-muted">
            ✈
          </span>
          <span>{to}</span>
        </div>

        <dl className="my-3.5 grid grid-cols-2 gap-x-3 gap-y-2.5">
          <LabelledValue label="Altitude">
            {plane ? formatAltitude(plane) : "—"}
          </LabelledValue>
          <LabelledValue label="Speed">
            {plane
              ? `${Math.round(plane.speed)} kt · ${Math.round(plane.speed * KM_PER_NAUTICAL_MILE)} km/h`
              : "—"}
          </LabelledValue>
          <LabelledValue label="Aircraft">
            {flight.type
              ? (AIRCRAFT_TYPES[flight.type] ?? flight.type)
              : "Unknown"}
          </LabelledValue>
          <LabelledValue label="Registration">
            {flight.registration ?? "—"}
          </LabelledValue>
          <LabelledValue label="Distance">
            {plane
              ? `${distanceKm(airport.center, plane.position).toFixed(1)} km from ${airportCode}`
              : "—"}
          </LabelledValue>
          <LabelledValue label="Heading">
            {plane ? formatHeading(plane.heading) : "—"}
          </LabelledValue>
        </dl>

        <label className="flex cursor-pointer items-center gap-2 accent-neon">
          <input
            type="checkbox"
            className="w-5 h-5"
            checked={isFollowing}
            onChange={(event) => onFollowChange(event.target.checked)}
          />
          Follow this plane
        </label>
      </div>

      <div
        role="tabpanel"
        id="flight-card-panel-radio"
        aria-labelledby="flight-card-tab-radio"
        className={`${tab === "radio" ? "block" : "hidden"} min-h-0 flex-1 overflow-y-auto sm:block`}
      >
        <RadioTranscript lines={radioLines} time={time} voice={radioVoice} />
      </div>
    </aside>
  );
}
