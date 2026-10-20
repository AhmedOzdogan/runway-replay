import { setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// maplibre-gl 6 ships its worker as a separate file; let Vite bundle it and tell maplibre where it is.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./style.css";

setWorkerUrl(workerUrl);

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element in index.html");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
