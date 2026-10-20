import type { ReactNode } from "react";
import { AIRCRAFT_TYPES, AIRLINES } from "../data/names";
import {
  describeStatus,
  isOnEstimatedPart,
  routeEnds,
  VERTICAL_RATE_THRESHOLD,
} from "../flights/status";
import type { Airport } from "../types/airport";
import type { Flight, Plane } from "../types/flight";
import { distanceKm } from "../utils/geo";

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

/** Info card for the selected aircraft; re-renders every frame while the replay plays. */
export function FlightCard({
  flight,
  plane,
  time,
  airportCode,
  airport,
  isFollowing,
  onFollowChange,
  onClose,
}: FlightCardProps) {
  const callsign = flight.callsign ?? flight.icao.toUpperCase();
  const { from, to } = routeEnds(flight, airportCode);
  const status = plane
    ? describeStatus(plane, time) +
      (isOnEstimatedPart(plane, time) ? " · estimated" : "")
    : `Not near ${airportCode} at this time`;

  return (
    <aside
      aria-live="polite"
      className="absolute top-4 right-4 z-10 w-[min(350px,calc(100vw-32px))] rounded-2xl border border-line bg-panel/95 p-4 shadow-card backdrop-blur-sm"
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
    </aside>
  );
}
