import { useMemo, useState } from "react";
import { FlightCard } from "./components/FlightCard";
import { Footer } from "./components/Footer";
import { GoAroundBanner } from "./components/GoAroundBanner";
import { Header } from "./components/Header";
import { TimeBar } from "./components/TimeBar";
import { AIRPORTS } from "./data/airports";
import { closestFlight, findParkings, planesAt } from "./flights/planes";
import { useFlights } from "./hooks/useFlights";
import { useGoAroundAlert } from "./hooks/useGoAroundAlert";
import { usePlayback } from "./hooks/usePlayback";
import { ReplayMap } from "./map/ReplayMap";

// ponytail: one fixed day until there's a date picker.
const DATE = "2026-10-18";
const DEFAULT_AIRPORT = "MUC";

export function App() {
  const [airportCode, setAirportCode] = useState(DEFAULT_AIRPORT);
  const [selectedIcao, setSelectedIcao] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);

  const airport = AIRPORTS[airportCode];
  const { flights, status } = useFlights(airportCode, DATE);
  // ponytail: clock is UTC, so Hanoi (UTC+7) starts its local day at 17:00; add per-airport offsets if that matters.
  const playback = usePlayback();
  const goAround = useGoAroundAlert(flights, playback.time);

  const parkings = useMemo(() => findParkings(flights), [flights]);
  const planes = useMemo(
    () => planesAt(flights, parkings, playback.time),
    [flights, parkings, playback.time],
  );
  const selectedPlane =
    planes.find((plane) => plane.flight.icao === selectedIcao) ?? null;
  // Keep showing the card (with "not near the airport") while the selected aircraft is away.
  const selectedFlight =
    selectedPlane?.flight ??
    (selectedIcao ? closestFlight(flights, selectedIcao, playback.time) : null);

  function selectPlane(icao: string | null) {
    setSelectedIcao(icao);
    if (!icao) setIsFollowing(false);
  }

  function selectAirport(code: string) {
    setAirportCode(code);
    selectPlane(null);
  }

  return (
    <div className="flex h-full flex-col">
      <Header
        airportCode={airportCode}
        status={status}
        onSelectAirport={selectAirport}
      />
      <main className="relative flex-1">
        <ReplayMap
          airportCode={airportCode}
          airport={airport}
          flights={flights}
          planes={planes}
          selectedPlane={selectedPlane}
          time={playback.time}
          isFollowing={isFollowing}
          onSelectPlane={selectPlane}
        />
        {selectedFlight && (
          <FlightCard
            flight={selectedFlight}
            plane={selectedPlane}
            time={playback.time}
            airportCode={airportCode}
            airport={airport}
            isFollowing={isFollowing}
            onFollowChange={setIsFollowing}
            onClose={() => selectPlane(null)}
          />
        )}
        {goAround.alert && (
          <GoAroundBanner
            key={goAround.alert.icao}
            flight={goAround.alert}
            airportCode={airportCode}
            onClick={() => {
              selectPlane(goAround.alert?.icao ?? null);
              goAround.dismiss();
            }}
          />
        )}
        {/* min(): 900px wide on desktop, but never wider than the screen minus a margin on phones. */}
        <div className="absolute bottom-4 left-1/2 z-10 w-[min(820px,calc(100%-24px))] -translate-x-1/2 rounded-3xl border border-white/10 bg-panel/85 px-4 py-3 shadow-card backdrop-blur-md sm:bottom-8 sm:px-6 sm:py-4">
          <TimeBar {...playback} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
