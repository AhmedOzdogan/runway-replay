import { TripsLayer } from "@deck.gl/geo-layers";
import { IconLayer } from "@deck.gl/layers";
import { MapboxOverlay } from "@deck.gl/mapbox";
import type { Map as MapLibreMap } from "maplibre-gl";
import { findParkings, type Parking, planeAt } from "../flights/planes";
import type { Flight, Plane } from "../types/flight";

const TRAIL_SECONDS = 300;
const NEON: [number, number, number] = [34, 211, 238];
const WHITE: [number, number, number] = [255, 255, 255];
const PARKED_GREY: [number, number, number] = [110, 122, 140];
const AMBER: [number, number, number] = [251, 191, 36];
const GO_AROUND_HIGHLIGHT_S = 180;

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

/**
 * Draws flights as fading neon trails with a plane icon at the head, plus parked planes.
 * `onSelection` is called on every frame while an aircraft is selected (plane is null when it's
 * not in the zone at that time), and once with icao null when the selection is cleared.
 */
export function createReplay(
  map: MapLibreMap,
  onSelection: (icao: string | null, plane: Plane | null) => void,
  onGoAround: (flight: Flight) => void,
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
  let goArounds: Flight[] = [];

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
                : isGoingAround(p.flight)
                  ? AMBER
                  : WHITE,
        }),
      ],
    });
    if (selected) onSelection(selected, selectedPlane);
  }

  function isGoingAround(f: Flight): boolean {
    return (
      f.goAroundAt !== undefined &&
      time >= f.goAroundAt &&
      time < f.goAroundAt + GO_AROUND_HIGHLIGHT_S
    );
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
      goArounds = next.filter((f) => f.goAroundAt !== undefined);
      select(null);
      render();
    },
    setTime(next) {
      // Announce go-arounds the replay plays through (not ones skipped over with the slider).
      if (next > time && next - time < 120) {
        for (const f of goArounds) {
          if (
            (f.goAroundAt as number) > time &&
            (f.goAroundAt as number) <= next
          )
            onGoAround(f);
        }
      }
      time = next;
      render();
    },
    select,
  };
}
