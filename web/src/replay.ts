import { TripsLayer } from "@deck.gl/geo-layers";
import { IconLayer } from "@deck.gl/layers";
import { MapboxOverlay } from "@deck.gl/mapbox";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { Flight, Point } from "./types";

const DAY = 86400;
const TRAIL_SECONDS = 300;
const NEON: [number, number, number] = [34, 211, 238];
const WHITE: [number, number, number] = [255, 255, 255];
const PARKED_GREY: [number, number, number] = [110, 122, 140];

// Top-down airplane pointing north; `mask` lets deck.gl tint it with getColor.
const PLANE_ICON = {
  id: "plane",
  url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><path fill="#fff" d="M32 2c-2.2 0-4 2.2-4 5v17L6 38v6l22-7v14l-6 5v4l10-3 10 3v-4l-6-5V37l22 7v-6L36 24V7c0-2.8-1.8-5-4-5z"/></svg>',
  )}`,
  width: 64,
  height: 64,
  mask: true,
};

export interface Plane {
  /** The flight it's on, or for a parked plane the flight it parked after (or before). */
  flight: Flight;
  position: [number, number];
  /** Degrees clockwise from north. */
  heading: number;
  altitude: number;
  /** Ground speed in knots. */
  speed: number;
  /** Feet per minute, positive when climbing. */
  verticalRate: number;
  /** sec_offset when it parked, or null while moving. 0 means parked since before midnight. */
  parkedSince: number | null;
}

interface Parking {
  from: number;
  to: number;
  flight: Flight;
  position: [number, number];
  heading: number;
}

/** Equirectangular distance in km; accurate enough over an airport zone. */
export function distanceKm(a: [number, number], b: [number, number]): number {
  const dx = (b[0] - a[0]) * 111.32 * Math.cos((a[1] * Math.PI) / 180);
  const dy = (b[1] - a[1]) * 110.57;
  return Math.hypot(dx, dy);
}

function headingBetween(a: Point, b: Point): number {
  const dx = (b[1] - a[1]) * Math.cos((a[2] * Math.PI) / 180);
  return (Math.atan2(dx, b[2] - a[2]) * 180) / Math.PI;
}

/** Where `flight` is at `time` (linear between points), or null if it isn't in the zone then. */
function planeAt(flight: Flight, time: number): Plane | null {
  const pts = flight.points;
  if (time < pts[0][0] || time > pts[pts.length - 1][0]) return null;
  // Binary search for the last point at or before `time`.
  let lo = 0;
  let hi = pts.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (pts[mid][0] <= time) lo = mid;
    else hi = mid;
  }
  const a = pts[lo];
  const b = pts[hi];
  const dt = b[0] - a[0];
  const k = dt > 0 ? (time - a[0]) / dt : 0;
  const km = distanceKm([a[1], a[2]], [b[1], b[2]]);
  return {
    flight,
    position: [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k],
    heading: headingBetween(a, b),
    altitude: a[3] + (b[3] - a[3]) * k,
    speed: dt > 0 ? km / (dt / 3600) / 1.852 : 0,
    verticalRate: dt > 0 ? ((b[3] - a[3]) / dt) * 60 : 0,
    parkedSince: null,
  };
}

/**
 * Parked spells: from where a flight stops on the ground until the same aircraft moves again
 * (or the day ends), and from midnight until a first flight that starts on the ground.
 * ponytail: "parked" means the data went quiet on the ground; we don't know it's really at a gate.
 */
function findParkings(flights: Flight[]): Parking[] {
  const byAircraft = new Map<string, Flight[]>();
  for (const f of flights)
    byAircraft.set(f.icao, [...(byAircraft.get(f.icao) ?? []), f]);

  const parkings: Parking[] = [];
  for (const list of byAircraft.values()) {
    list.sort((a, b) => a.points[0][0] - b.points[0][0]);
    list.forEach((f, i) => {
      const pts = f.points;
      const first = pts[0];
      const last = pts[pts.length - 1];
      if (i === 0 && first[3] === 0) {
        parkings.push({
          from: 0,
          to: first[0],
          flight: f,
          position: [first[1], first[2]],
          heading: headingBetween(first, pts[1]),
        });
      }
      if (last[3] === 0) {
        parkings.push({
          from: last[0],
          to: list[i + 1]?.points[0][0] ?? DAY,
          flight: f,
          position: [last[1], last[2]],
          heading: headingBetween(pts[pts.length - 2], last),
        });
      }
    });
  }
  return parkings;
}

/**
 * Draws flights as fading neon trails with a plane icon at the head, plus parked planes.
 * `onSelection` is called on every frame while an aircraft is selected (plane is null when it's
 * not in the zone at that time), and once with icao null when the selection is cleared.
 */
export function createReplay(
  map: MapLibreMap,
  onSelection: (icao: string | null, plane: Plane | null) => void,
): {
  setFlights: (flights: Flight[]) => void;
  setTime: (time: number) => void;
  select: (icao: string | null) => void;
} {
  const overlay = new MapboxOverlay({
    interleaved: false,
    layers: [],
    // The deck canvas ignores the mouse, so set the cursor on the map canvas below it.
    // Clearing it restores MapLibre's own grab / grabbing cursors for panning.
    onHover: ({ object }) => {
      map.getCanvas().style.cursor = object ? "pointer" : "";
    },
    onClick: (info) =>
      select((info.object as Plane | undefined)?.flight.icao ?? null),
    getTooltip: ({ object }) => {
      const plane = object as Plane | undefined;
      if (!plane) return null;
      const { callsign, icao, type } = plane.flight;
      return {
        text: `${callsign ?? icao}${type ? ` · ${type}` : ""}${plane.parkedSince !== null ? " · parked" : ""}`,
        style: {
          background: "#11161f",
          color: "#d7deea",
          fontSize: "12px",
          borderRadius: "6px",
          padding: "4px 8px",
        },
      };
    },
  });
  map.addControl(overlay);

  let flights: Flight[] = [];
  let parkings: Parking[] = [];
  let time = 0;
  let selected: string | null = null;

  // deck.gl only re-reads the trail accessors when `data` changes; per-frame updates just move
  // currentTime. Planes are recomputed every frame (cheap: a binary search per flight).
  function render(): void {
    const planes: Plane[] = [];
    for (const p of parkings) {
      if (time >= p.from && time < p.to) {
        planes.push({
          ...p,
          altitude: 0,
          speed: 0,
          verticalRate: 0,
          parkedSince: p.from,
        });
      }
    }
    for (const f of flights) {
      const plane = planeAt(f, time);
      if (plane) planes.push(plane);
    }
    const selectedPlane =
      planes.find((p) => p.flight.icao === selected) ?? null;
    if (selectedPlane) planes.push(selectedPlane); // drawn again on top

    overlay.setProps({
      layers: [
        new TripsLayer<Flight>({
          id: "trips",
          data: flights,
          getPath: (f) => f.points.map((p): [number, number] => [p[1], p[2]]),
          getTimestamps: (f) => f.points.map((p) => p[0]),
          getColor: NEON,
          widthMinPixels: 2,
          capRounded: true,
          jointRounded: true,
          fadeTrail: true,
          trailLength: TRAIL_SECONDS,
          currentTime: time,
        }),
        new IconLayer<Plane>({
          id: "planes",
          data: planes,
          pickable: true,
          getIcon: () => PLANE_ICON,
          getPosition: (p) => p.position,
          // IconLayer angles are counter-clockwise; headings are clockwise.
          getAngle: (p) => -p.heading,
          getSize: (p) =>
            p === selectedPlane ? 42 : p.parkedSince !== null ? 20 : 32,
          getColor: (p) =>
            p === selectedPlane
              ? NEON
              : p.parkedSince !== null
                ? PARKED_GREY
                : WHITE,
        }),
      ],
    });
    if (selected) onSelection(selected, selectedPlane);
  }

  function select(icao: string | null): void {
    if (icao === selected) return;
    selected = icao;
    if (!icao) onSelection(null, null);
    render();
  }

  return {
    setFlights(next) {
      flights = next;
      parkings = findParkings(next);
      select(null);
      render();
    },
    setTime(next) {
      time = next;
      render();
    },
    select,
  };
}
