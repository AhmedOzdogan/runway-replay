import { Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// maplibre-gl 6 ships its worker as a separate file; let Vite bundle it and tell maplibre where it is.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";

setWorkerUrl(workerUrl);

const FRA: [number, number] = [8.5706, 50.0333];

new MapLibreMap({
  container: "map",
  style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  center: FRA,
  zoom: 10,
});

// TODO: load data/sample.json and start the replay (see replay.ts)
