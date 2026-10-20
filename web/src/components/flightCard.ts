import type { Airport } from "../airports";
import { query } from "../dom";
import { AIRCRAFT_TYPES, AIRLINES } from "../names";
import { distanceKm, type Plane } from "../replay";
import type { Flight } from "../types";

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

function duration(seconds: number): string {
  return seconds < 90
    ? `${Math.max(1, Math.round(seconds))} s`
    : `${Math.round(seconds / 60)} min`;
}

/** Arrival, departure, ground move or overflight, with touchdown / takeoff times. */
function flightKind(f: Flight): {
  kind: "arrival" | "departure" | "ground" | "overflight";
  at: number;
} {
  const pts = f.points;
  const startsOnGround = pts[0][3] === 0;
  const endsOnGround = pts[pts.length - 1][3] === 0;
  if (endsOnGround && !startsOnGround) {
    let i = pts.length - 1;
    while (i > 0 && pts[i - 1][3] === 0) i--;
    return { kind: "arrival", at: pts[i][0] };
  }
  if (startsOnGround && !endsOnGround) {
    return {
      kind: "departure",
      at: pts.find((p) => p[3] > 0)?.[0] ?? pts[0][0],
    };
  }
  return { kind: startsOnGround ? "ground" : "overflight", at: pts[0][0] };
}

function status(plane: Plane, time: number): string {
  if (plane.parkedSince !== null) {
    return plane.parkedSince === 0
      ? "Parked"
      : `Parked · ${duration(time - plane.parkedSince)}`;
  }
  const { kind, at } = flightKind(plane.flight);
  if (kind === "arrival") {
    return time < at
      ? `On approach · lands in ${duration(at - time)}`
      : `Landed ${duration(time - at)} ago · taxiing`;
  }
  if (kind === "departure") {
    return time < at
      ? `Taxiing · takes off in ${duration(at - time)}`
      : `Took off ${duration(time - at)} ago`;
  }
  if (kind === "ground") return "Taxiing";
  return plane.verticalRate > 300
    ? "Passing by · climbing"
    : plane.verticalRate < -300
      ? "Passing by · descending"
      : "Passing by";
}

/**
 * Info card for the selected aircraft. Call `update` every frame while something is selected.
 * Text is set with textContent only: callsigns and registrations come from external data.
 */
export function createFlightCard(handlers: {
  onClose: () => void;
  onFollow: (follow: boolean) => void;
}): {
  element: HTMLElement;
  update: (
    flight: Flight,
    plane: Plane | null,
    time: number,
    airport: { code: string } & Airport,
  ) => void;
  hide: () => void;
} {
  const element = document.createElement("aside");
  element.className = "flight-card";
  element.hidden = true;
  element.setAttribute("aria-live", "polite");
  element.innerHTML = `
    <button type="button" class="close" aria-label="Close">×</button>
    <div class="callsign"></div>
    <div class="airline"></div>
    <div class="status"></div>
    <div class="route"><span class="from"></span><span class="arrow">✈</span><span class="to"></span></div>
    <dl>
      <div><dt>Altitude</dt><dd class="altitude"></dd></div>
      <div><dt>Speed</dt><dd class="speed"></dd></div>
      <div><dt>Aircraft</dt><dd class="type"></dd></div>
      <div><dt>Registration</dt><dd class="registration"></dd></div>
      <div><dt>Distance</dt><dd class="distance"></dd></div>
      <div><dt>Heading</dt><dd class="heading"></dd></div>
    </dl>
    <label class="follow"><input type="checkbox" /> Follow this plane</label>
  `;
  const field = (name: string) => query<HTMLElement>(element, `.${name}`);
  const follow = query<HTMLInputElement>(element, ".follow input");

  query(element, ".close").addEventListener("click", handlers.onClose);
  follow.addEventListener("change", () => handlers.onFollow(follow.checked));

  function update(
    flight: Flight,
    plane: Plane | null,
    time: number,
    airport: { code: string } & Airport,
  ): void {
    element.hidden = false;
    const callsign = flight.callsign ?? flight.icao.toUpperCase();
    field("callsign").textContent = callsign;
    field("airline").textContent = AIRLINES[callsign.slice(0, 3)] ?? "";
    field("type").textContent = flight.type
      ? (AIRCRAFT_TYPES[flight.type] ?? flight.type)
      : "Unknown";
    field("registration").textContent = flight.registration ?? "—";

    const { kind } = flightKind(flight);
    field("from").textContent =
      kind === "departure" || kind === "ground" ? airport.code : "?";
    field("to").textContent =
      kind === "arrival" || kind === "ground" ? airport.code : "?";

    if (!plane) {
      field("status").textContent = `Not near ${airport.code} at this time`;
      for (const name of ["altitude", "speed", "distance", "heading"])
        field(name).textContent = "—";
      return;
    }
    const { estimatedBefore, estimatedAfter } = plane.flight;
    const estimated =
      plane.parkedSince === null &&
      ((estimatedBefore !== undefined && time < estimatedBefore) ||
        (estimatedAfter !== undefined && time > estimatedAfter));
    field("status").textContent =
      status(plane, time) + (estimated ? " · estimated" : "");
    const trend =
      plane.verticalRate > 300 ? " ↑" : plane.verticalRate < -300 ? " ↓" : "";
    field("altitude").textContent =
      plane.altitude > 0
        ? `${Math.round(plane.altitude).toLocaleString("en")} ft${trend}`
        : "On ground";
    field("speed").textContent =
      `${Math.round(plane.speed)} kt · ${Math.round(plane.speed * 1.852)} km/h`;
    field("distance").textContent =
      `${distanceKm(airport.center, plane.position).toFixed(1)} km from ${airport.code}`;
    const heading = (Math.round(plane.heading) + 360) % 360;
    field("heading").textContent =
      `${heading}° ${COMPASS[Math.round(heading / 45) % 8]}`;
  }

  function hide(): void {
    element.hidden = true;
    follow.checked = false;
  }

  return { element, update, hide };
}
