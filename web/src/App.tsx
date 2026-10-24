import { useEffect, useMemo, useState } from "react";
import { AboutDialog, type AboutSection } from "./components/AboutDialog";
import { FlightCard } from "./components/FlightCard";
import { Footer } from "./components/Footer";
import { GoAroundBanner } from "./components/GoAroundBanner";
import { Header } from "./components/Header";
import { LoadingScreen } from "./components/LoadingScreen";
import { TimeBar } from "./components/TimeBar";
import { AIRPORTS } from "./data/airports";
import { closestFlight, findParkings, planesAt } from "./flights/planes";
import { linesSoFar, radioScript, talkingLine } from "./flights/radioScript";
import { useFlights } from "./hooks/useFlights";
import { useGoAroundAlert } from "./hooks/useGoAroundAlert";
import { usePlayback } from "./hooks/usePlayback";
import { useRadioVoice } from "./hooks/useRadioVoice";
import { ReplayMap } from "./map/ReplayMap";
import { lineKey } from "./sound/radioVoicePlan";
import { type Flight, TIME } from "./types/flight";

const DEFAULT_AIRPORT = "MUC";
// If the tiles never arrive (blocked CDN, no network), don't trap the user behind the loading screen.
const MAP_READY_TIMEOUT_MS = 8000;

export function App() {
  const [airportCode, setAirportCode] = useState(DEFAULT_AIRPORT);
  const [selectedIcao, setSelectedIcao] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [aboutSection, setAboutSection] = useState<AboutSection | null>(null);
  const [isMapReady, setIsMapReady] = useState<boolean>(false);

  const airport = AIRPORTS[airportCode];
  const { flights, status, isLoading } = useFlights(airportCode);
  const isStarting = !isMapReady || (isLoading && flights.length === 0);
  // ponytail: the clock is UTC, which is close enough for these three airports; add per-airport
  // offsets if somewhere further east is ever added.
  // While the selected plane's radio talks, hold the replay at 1x so it can be read and heard.
  // Set from an effect below, so it takes effect one frame later: unnoticeable.
  const [isRadioSlowMotion, setIsRadioSlowMotion] = useState(false);
  const playback = usePlayback(isRadioSlowMotion ? 1 : undefined);
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

  // The selected flight's whole radio conversation, and the part said so far.
  const radio = useMemo(
    () => (selectedFlight ? radioScript(selectedFlight, airport) : []),
    [selectedFlight, airport],
  );
  const radioLines = linesSoFar(radio, playback.time);
  const radioVoice = useRadioVoice(radio, playback.time);
  // Stay at 1x while a line is shown or still being spoken (a spoken line can run longer). With
  // the voice on, a line whose audio isn't ready gets skipped, so there is nothing to slow for.
  const talking = talkingLine(radio, playback.time);
  const isTalkingAudible =
    talking !== null &&
    (radioVoice.status !== "on" ||
      radioVoice.readyLineKeys.has(lineKey(talking)));
  const radioTalking = isTalkingAudible || radioVoice.isSpeaking;
  useEffect(() => setIsRadioSlowMotion(radioTalking), [radioTalking]);

  useEffect(() => {
    const timer = setTimeout(() => setIsMapReady(true), MAP_READY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  function selectPlane(icao: string | null) {
    setSelectedIcao(icao);
    if (!icao) setIsFollowing(false);
  }

  function selectAirport(code: string) {
    setAirportCode(code);
    selectPlane(null);
  }

  function pickFlight(flight: Flight) {
    playback.seek(flight.points[0][TIME]);
    selectPlane(flight.icao);
    setIsFollowing(true);
  }

  return (
    <div className="flex h-full flex-col">
      <Header
        airportCode={airportCode}
        status={status}
        onSelectAirport={selectAirport}
        onOpenHelp={() => setAboutSection("about")}
        flights={flights}
        onPickFlight={pickFlight}
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
          onReady={() => setIsMapReady(true)}
        />
        {selectedFlight && (
          <FlightCard
            flight={selectedFlight}
            plane={selectedPlane}
            time={playback.time}
            airportCode={airportCode}
            airport={airport}
            isFollowing={isFollowing}
            radioLines={radioLines}
            radioVoice={radioVoice}
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
          <TimeBar {...playback} isRadioSlowMotion={isRadioSlowMotion} />
        </div>
        {isStarting && <LoadingScreen airportName={airport.name} />}
      </main>

      <Footer onOpenLegal={() => setAboutSection("legal")} />
      <AboutDialog
        openAt={aboutSection}
        onClose={() => setAboutSection(null)}
      />
    </div>
  );
}
