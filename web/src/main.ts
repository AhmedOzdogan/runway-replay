import { Map as MapLibreMap, Marker, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// maplibre-gl 6 ships its worker as a separate file; let Vite bundle it and tell maplibre where it is.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { AIRPORTS } from "./airports";
import { createAirportPicker } from "./components/airportPicker";
import { createFlightCard } from "./components/flightCard";
import { createTimeBar } from "./components/timeBar";
import { loadFlights } from "./data";
import { query } from "./dom";
import { fillMissingEnds } from "./estimate";
import { createReplay } from "./replay";
import type { Flight } from "./types";
import "./style.css";

setWorkerUrl(workerUrl);

// ponytail: one fixed day until there's a date picker.
const DATE = "2026-10-18";

const map = new MapLibreMap({
  container: "map",
  style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  center: AIRPORTS.MUC.center,
  zoom: 10,
});

// The dark style draws runways in #111 from zoom 12 only; make them visible at our zoom.
map.on("load", () => {
  map.setLayerZoomRange("aeroway-runway", 9, 24);
  map.setPaintProperty("aeroway-runway", "line-color", "#3d4b5f");
  map.setPaintProperty("aeroway-taxiway", "line-color", "#2a3442");
});

const airportMarker = new Marker({
  element: Object.assign(document.createElement("div"), {
    className: "airport-marker",
  }),
})
  .setLngLat(AIRPORTS.MUC.center)
  .addTo(map);

const status = query<HTMLElement>(document, "#status");
let currentAirport = "MUC";
let currentTime = 0;
let following = false;

const flightCard = createFlightCard({
  onClose: () => replay.select(null),
  onFollow: (follow) => {
    following = follow;
  },
});
document.body.append(flightCard.element);

let lastSelectedFlight: Flight | null = null;
const replay = createReplay(map, (icao, plane) => {
  if (!icao) {
    flightCard.hide();
    following = false;
    lastSelectedFlight = null;
    return;
  }
  lastSelectedFlight = plane?.flight ?? lastSelectedFlight;
  if (!lastSelectedFlight) return;
  flightCard.update(lastSelectedFlight, plane, currentTime, {
    code: currentAirport,
    ...AIRPORTS[currentAirport],
  });
  if (following && plane) map.jumpTo({ center: plane.position });
});

async function showAirport(code: string): Promise<void> {
  currentAirport = code;
  map.flyTo({ center: AIRPORTS[code].center, zoom: 10 });
  airportMarker.setLngLat(AIRPORTS[code].center);
  airportMarker.getElement().textContent = code;

  replay.setFlights([]);
  status.textContent = "Loading…";
  try {
    const { flights, sample } = await loadFlights(code, DATE);
    if (currentAirport !== code) return; // the user picked another airport meanwhile
    replay.setFlights(fillMissingEnds(flights, AIRPORTS[code]));
    status.textContent = sample
      ? `No data for ${code} on ${DATE} yet${flights.length ? ", showing sample flights" : ""}`
      : `${flights.length} flights · ${DATE}`;
  } catch (err) {
    if (currentAirport === code)
      status.textContent = `Could not load ${code}: ${err}`;
  }
}

const airportPicker = createAirportPicker(AIRPORTS, showAirport);
query(document, "header").append(airportPicker.element);
airportPicker.select("MUC");

// ponytail: clock is UTC, so Hanoi (UTC+7) starts its local day at 17:00; add per-airport offsets if that matters.
const timeBar = createTimeBar((time) => {
  currentTime = time;
  replay.setTime(time);
});
query(document, "footer").prepend(timeBar.element);
