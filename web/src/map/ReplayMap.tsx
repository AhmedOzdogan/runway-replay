import type { PickingInfo } from "@deck.gl/core";
import type { MapLibreEvent } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, type MapRef, Marker } from "react-map-gl/maplibre";
import { isGroundVehicle } from "../flights/vehicle";
import type { Airport } from "../types/airport";
import type { Flight, Plane } from "../types/flight";
import { DeckOverlay } from "./DeckOverlay";
import { createPlaneLayer, createTrailLayer } from "./layers";

const MAP_STYLE_URL =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const DEFAULT_ZOOM = 10;

const TOOLTIP_STYLE = {
  background: "#11161f",
  color: "#d7deea",
  fontSize: "12px",
  borderRadius: "6px",
  padding: "4px 8px",
};

// The dark style draws runways in #111 from zoom 12 only; make them visible at our zoom.
function brightenRunways(event: MapLibreEvent) {
  const map = event.target;
  map.setLayerZoomRange("aeroway-runway", 9, 24);
  map.setPaintProperty("aeroway-runway", "line-color", "#3d4b5f");
  map.setPaintProperty("aeroway-taxiway", "line-color", "#2a3442");
  map.setFilter("aeroway-runway", [
    "all",
    ["==", "$type", "LineString"],
    ["==", "class", "runway"],
  ]);
}

function planeTooltip({ object }: PickingInfo<Plane>) {
  if (!object) return null;
  const { callsign, icao, type } = object.flight;
  const parts = isGroundVehicle(object.flight)
    ? [callsign ?? icao, "ground vehicle"]
    : [callsign ?? icao, type, object.parkedSince !== null ? "parked" : null];
  return { text: parts.filter(Boolean).join(" · "), style: TOOLTIP_STYLE };
}

interface ReplayMapProps {
  airportCode: string;
  airport: Airport;
  flights: Flight[];
  planes: Plane[];
  selectedPlane: Plane | null;
  time: number;
  isFollowing: boolean;
  onSelectPlane: (icao: string | null) => void;
}

/** The dark map with the airport label, neon trails and plane icons. */
export function ReplayMap({
  airportCode,
  airport,
  flights,
  planes,
  selectedPlane,
  time,
  isFollowing,
  onSelectPlane,
}: ReplayMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [isHoveringPlane, setIsHoveringPlane] = useState(false);

  useEffect(() => {
    mapRef.current?.flyTo({ center: airport.center, zoom: DEFAULT_ZOOM });
  }, [airport]);

  const followPosition = isFollowing ? selectedPlane?.position : undefined;
  useEffect(() => {
    if (followPosition) mapRef.current?.jumpTo({ center: followPosition });
  }, [followPosition]);

  return (
    <MapLibreMap
      ref={mapRef}
      initialViewState={{
        longitude: airport.center[0],
        latitude: airport.center[1],
        zoom: DEFAULT_ZOOM,
      }}
      mapStyle={MAP_STYLE_URL}
      onLoad={brightenRunways}
      // Empty keeps MapLibre's own grab / grabbing cursors for panning.
      cursor={isHoveringPlane ? "pointer" : ""}
    >
      <Marker
        longitude={airport.center[0]}
        latitude={airport.center[1]}
        // deck.gl draws in MapLibre's top-left control corner (z-index 2); stay above it, and let clicks through.
        style={{ pointerEvents: "none", zIndex: 3 }}
      >
        <div className="rounded-full border border-neon bg-night/80 px-2 py-0.5 text-xs font-semibold tracking-widest text-neon shadow-neon">
          {airportCode}
        </div>
      </Marker>
      <DeckOverlay
        layers={[
          createTrailLayer(flights, time),
          createPlaneLayer(planes, selectedPlane, time),
        ]}
        // Only aircraft are clickable: ground vehicles get a tooltip but no flight card.
        onHover={({ object }) =>
          setIsHoveringPlane(
            Boolean(object) && !isGroundVehicle((object as Plane).flight),
          )
        }
        onClick={({ object }) => {
          const plane = object as Plane | undefined;
          onSelectPlane(
            plane && !isGroundVehicle(plane.flight) ? plane.flight.icao : null,
          );
        }}
        getTooltip={planeTooltip}
      />
    </MapLibreMap>
  );
}
