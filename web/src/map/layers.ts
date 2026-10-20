import { TripsLayer } from "@deck.gl/geo-layers";
import { IconLayer } from "@deck.gl/layers";
import { isGoingAround } from "../flights/status";
import { type Flight, LAT, LON, type Plane, TIME } from "../types/flight";

const TRAIL_SECONDS = 300;

type Color = [number, number, number];
const NEON: Color = [34, 211, 238];
const WHITE: Color = [255, 255, 255];
const PARKED_GREY: Color = [110, 122, 140];
const AMBER: Color = [251, 191, 36];

const ICON_SIZE_SELECTED = 42;
const ICON_SIZE_FLYING = 32;
const ICON_SIZE_PARKED = 20;

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

// Defined once, so deck.gl only re-reads the trails when the flights change, not on every frame.
const flightPath = (flight: Flight) =>
  flight.points.map((point): [number, number] => [point[LON], point[LAT]]);
const flightTimestamps = (flight: Flight) =>
  flight.points.map((point) => point[TIME]);

/** Fading neon trails up to `time`. */
export function createTrailLayer(flights: Flight[], time: number) {
  return new TripsLayer<Flight>({
    id: "trails",
    data: flights,
    getPath: flightPath,
    getTimestamps: flightTimestamps,
    getColor: NEON,
    widthMinPixels: 2,
    capRounded: true,
    jointRounded: true,
    fadeTrail: true,
    trailLength: TRAIL_SECONDS,
    currentTime: time,
  });
}

/** A plane icon per aircraft: white when flying, grey when parked, amber after a go-around, neon when selected. */
export function createPlaneLayer(
  planes: Plane[],
  selectedPlane: Plane | null,
  time: number,
) {
  const iconColor = (plane: Plane): Color => {
    if (plane === selectedPlane) return NEON;
    if (plane.parkedSince !== null) return PARKED_GREY;
    return isGoingAround(plane.flight, time) ? AMBER : WHITE;
  };
  const iconSize = (plane: Plane): number => {
    if (plane === selectedPlane) return ICON_SIZE_SELECTED;
    return plane.parkedSince !== null ? ICON_SIZE_PARKED : ICON_SIZE_FLYING;
  };

  return new IconLayer<Plane>({
    id: "planes",
    // The selected plane is drawn again at the end so it's on top.
    data: selectedPlane ? [...planes, selectedPlane] : planes,
    pickable: true,
    getIcon: () => PLANE_ICON,
    getPosition: (plane) => plane.position,
    // IconLayer angles are counter-clockwise; headings are clockwise.
    getAngle: (plane) => -plane.heading,
    getSize: iconSize,
    getColor: iconColor,
  });
}
