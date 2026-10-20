import { AIRCRAFT_TYPES, AIRLINES } from "../data/names";
import type { Airport } from "../types/airport";
import type { Flight, Plane } from "../types/flight";
import { h } from "../utils/dom";
import { distanceKm } from "../utils/geo";

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

function clockTime(t: number): string {
  return new Date(t * 1000).toISOString().slice(11, 16);
}

function status(plane: Plane, time: number): string {
  if (plane.parkedSince !== null) {
    return plane.parkedSince === 0
      ? "Parked"
      : `Parked · ${duration(time - plane.parkedSince)}`;
  }
  const goAround = plane.flight.goAroundAt;
  if (goAround !== undefined && time >= goAround && time < goAround + 90)
    return "GO AROUND!";
  const wentAround =
    goAround !== undefined && time >= goAround
      ? `Went around at ${clockTime(goAround)} · `
      : "";

  const { kind, at } = flightKind(plane.flight);
  if (kind === "arrival") {
    // Don't count down to a landing that comes after a go-around the plane hasn't flown yet.
    if (goAround !== undefined && time < goAround) return "On approach";
    if (time >= at) return `Landed ${duration(time - at)} ago · taxiing`;
    return wentAround
      ? `${wentAround}lands in ${duration(at - time)}`
      : `On approach · lands in ${duration(at - time)}`;
  }
  if (kind === "departure") {
    return time < at
      ? `Taxiing · takes off in ${duration(at - time)}`
      : `Took off ${duration(time - at)} ago`;
  }
  if (kind === "ground") return "Taxiing";
  if (goAround !== undefined && time < goAround) return "On approach";
  if (wentAround) return `${wentAround}climbing away`;
  return plane.verticalRate > 300
    ? "Passing by · climbing"
    : plane.verticalRate < -300
      ? "Passing by · descending"
      : "Passing by";
}

/**
 * Info card for the selected aircraft. Call `update` every frame while something is selected.
 * Built with h() and filled with textContent only: callsigns and registrations come from external data.
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
  const fields = {
    callsign: h("div", {
      class: "text-2xl font-bold tracking-wide text-neon text-shadow-neon",
    }),
    airline: h("div", { class: "min-h-[1.4em] text-muted" }),
    status: h("div", {
      class:
        "my-2.5 inline-block rounded-full bg-neon/10 px-2.5 py-0.5 text-[13px] text-neon",
    }),
    from: h("span"),
    to: h("span"),
    altitude: h("dd", { class: "mt-0.5 tabular-nums" }),
    speed: h("dd", { class: "mt-0.5 tabular-nums" }),
    type: h("dd", { class: "mt-0.5 tabular-nums" }),
    registration: h("dd", { class: "mt-0.5 tabular-nums" }),
    distance: h("dd", { class: "mt-0.5 tabular-nums" }),
    heading: h("dd", { class: "mt-0.5 tabular-nums" }),
  };
  const stat = (label: string, value: HTMLElement) =>
    h(
      "div",
      {},
      h(
        "dt",
        { class: "text-[11px] tracking-wider text-muted uppercase" },
        label,
      ),
      value,
    );
  const closeButton = h(
    "button",
    {
      type: "button",
      class:
        "absolute top-2.5 right-2.5 size-7 cursor-pointer rounded-full border border-line text-lg leading-none hover:border-muted",
      "aria-label": "Close",
    },
    "×",
  );
  const follow = h("input", { type: "checkbox" });

  const element = h(
    "aside",
    {
      class:
        "fixed top-[72px] right-4 z-10 w-[min(300px,calc(100vw-32px))] rounded-2xl border border-line bg-panel/95 p-4 shadow-card backdrop-blur-sm",
      hidden: true,
      "aria-live": "polite",
    },
    closeButton,
    fields.callsign,
    fields.airline,
    fields.status,
    h(
      "div",
      {
        class:
          "flex items-center justify-between text-xl font-semibold tracking-wider",
      },
      fields.from,
      h(
        "span",
        {
          class:
            "mx-2.5 flex-1 border-b border-dashed border-line text-center text-sm leading-[0.1] text-muted",
        },
        "✈",
      ),
      fields.to,
    ),
    h(
      "dl",
      { class: "my-3.5 grid grid-cols-2 gap-x-3 gap-y-2.5" },
      stat("Altitude", fields.altitude),
      stat("Speed", fields.speed),
      stat("Aircraft", fields.type),
      stat("Registration", fields.registration),
      stat("Distance", fields.distance),
      stat("Heading", fields.heading),
    ),
    h(
      "label",
      { class: "flex cursor-pointer items-center gap-2 accent-neon" },
      follow,
      " Follow this plane",
    ),
  );

  closeButton.addEventListener("click", handlers.onClose);
  follow.addEventListener("change", () => handlers.onFollow(follow.checked));

  function update(
    flight: Flight,
    plane: Plane | null,
    time: number,
    airport: { code: string } & Airport,
  ): void {
    element.hidden = false;
    const callsign = flight.callsign ?? flight.icao.toUpperCase();
    fields.callsign.textContent = callsign;
    fields.airline.textContent = AIRLINES[callsign.slice(0, 3)] ?? "";
    fields.type.textContent = flight.type
      ? (AIRCRAFT_TYPES[flight.type] ?? flight.type)
      : "Unknown";
    fields.registration.textContent = flight.registration ?? "—";

    const { kind } = flightKind(flight);
    fields.from.textContent =
      kind === "departure" || kind === "ground" ? airport.code : "?";
    fields.to.textContent =
      kind === "arrival" || kind === "ground" ? airport.code : "?";

    if (!plane) {
      fields.status.textContent = `Not near ${airport.code} at this time`;
      for (const dd of [
        fields.altitude,
        fields.speed,
        fields.distance,
        fields.heading,
      ]) {
        dd.textContent = "—";
      }
      return;
    }
    const { estimatedBefore, estimatedAfter } = plane.flight;
    const estimated =
      plane.parkedSince === null &&
      ((estimatedBefore !== undefined && time < estimatedBefore) ||
        (estimatedAfter !== undefined && time > estimatedAfter));
    fields.status.textContent =
      status(plane, time) + (estimated ? " · estimated" : "");
    const trend =
      plane.verticalRate > 300 ? " ↑" : plane.verticalRate < -300 ? " ↓" : "";
    fields.altitude.textContent =
      plane.altitude > 0
        ? `${Math.round(plane.altitude).toLocaleString("en")} ft${trend}`
        : "On ground";
    fields.speed.textContent = `${Math.round(plane.speed)} kt · ${Math.round(plane.speed * 1.852)} km/h`;
    fields.distance.textContent = `${distanceKm(airport.center, plane.position).toFixed(1)} km from ${airport.code}`;
    const heading = (Math.round(plane.heading) + 360) % 360;
    fields.heading.textContent = `${heading}° ${COMPASS[Math.round(heading / 45) % 8]}`;
  }

  function hide(): void {
    element.hidden = true;
    follow.checked = false;
  }

  return { element, update, hide };
}
