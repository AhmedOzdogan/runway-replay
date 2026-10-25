import { useEffect, useMemo, useRef, useState } from "react";
import { AboutDialog, type AboutSection } from "./components/AboutDialog";
import { FlightCard } from "./components/FlightCard";
import { Footer } from "./components/Footer";
import { GoAroundBanner } from "./components/GoAroundBanner";
import { GuessDestinationCard } from "./components/GuessDestinationCard";
import { Header } from "./components/Header";
import { LoadingScreen } from "./components/LoadingScreen";
import { TimeBar } from "./components/TimeBar";
import { AIRPORTS } from "./data/airports";
import { closestFlight, findParkings, planesAt } from "./flights/planes";
import { linesSoFar, radioScript, talkingLine } from "./flights/radioScript";
import { useFlights } from "./hooks/useFlights";
import { useGoAroundAlert } from "./hooks/useGoAroundAlert";
import { useGuessDestination } from "./hooks/useGuessDestination";
import { usePlayback } from "./hooks/usePlayback";
import { useRadioVoice } from "./hooks/useRadioVoice";
import { ReplayMap } from "./map/ReplayMap";
import { lineKey } from "./sound/radioVoicePlan";
import { type Flight, TIME } from "./types/flight";

const DEFAULT_AIRPORT = "MUC";
// If the tiles never arrive (blocked CDN, no network), don't trap the user behind the loading screen.
const MAP_READY_TIMEOUT_MS = 8000;
// Fast enough that a guess-the-destination round shows real movement, slow enough to follow.
const GAME_SPEED = 16;

export function App() {
  const [airportCode, setAirportCode] = useState(DEFAULT_AIRPORT);
  const [selectedIcao, setSelectedIcao] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [aboutSection, setAboutSection] = useState<AboutSection | null>(null);
  const [isArcadeOpen, setIsArcadeOpen] = useState(false);
  const [isMapReady, setIsMapReady] = useState<boolean>(false);

  const airport = AIRPORTS[airportCode];
  const { flights, status, date, isLoading } = useFlights(airportCode);
  const isStarting = !isMapReady || (isLoading && flights.length === 0);
  // ponytail: the clock is UTC, which is close enough for these three airports; add per-airport
  // offsets if somewhere further east is ever added.
  // While the selected plane's radio talks, hold the replay at 1x so it can be read and heard.
  // Set from an effect below, so it takes effect one frame later: unnoticeable.
  const [isRadioSlowMotion, setIsRadioSlowMotion] = useState(false);
  // The radio holds the replay at 1x so a transmission can be read — but not during a game, where
  // the point is watching the aircraft cover ground. Set from an effect below, a frame later.
  const [isGameOn, setIsGameOn] = useState(false);
  const playback = usePlayback(isRadioSlowMotion && !isGameOn ? 1 : undefined);
  const goAround = useGoAroundAlert(flights, playback.time);
  // The game jumps the replay to each flight it asks about.
  const guessDestination = useGuessDestination({
    flights,
    date,
    time: playback.time,
    seek: playback.seek,
    setPlaying: playback.setPlaying,
  });
  // A card fills the bottom of a phone screen; the time bar gets out of its way there.
  const isCardOpen = isArcadeOpen || selectedIcao !== null;
  const isPlayingGame =
    guessDestination.phase === "playing" ||
    guessDestination.phase === "reviewing";

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

  // Watch the aircraft being asked about: select it, follow it, and keep the usual flight card
  // out of the way — it names the destination, which is the whole question.
  const gameIcao = isPlayingGame
    ? (guessDestination.round?.flight.icao ?? null)
    : null;
  useEffect(() => {
    if (!gameIcao) return;
    setSelectedIcao(gameIcao);
    setIsFollowing(true);
  }, [gameIcao]);

  // The game runs the replay fast: ten seconds of thinking covers a couple of minutes of flight,
  // enough to see which way the aircraft turns. The speed the player chose comes back afterwards.
  useEffect(() => setIsGameOn(isPlayingGame), [isPlayingGame]);

  // Only the speed: starting and stopping belong to the game, which plays each flight and holds
  // it at the edge of the zone. Forcing play here would undo that the moment it stopped.
  const { speed, setSpeed } = playback;
  const speedBeforeGame = useRef(speed);
  useEffect(() => {
    if (isPlayingGame) {
      setSpeed(GAME_SPEED);
    } else if (speedBeforeGame.current !== GAME_SPEED) {
      setSpeed(speedBeforeGame.current);
    }
  }, [isPlayingGame, setSpeed]);

  return (
    <div className="flex h-full flex-col">
      <Header
        airportCode={airportCode}
        status={status}
        onSelectAirport={selectAirport}
        onOpenHelp={() => setAboutSection("about")}
        flights={flights}
        onPickFlight={pickFlight}
        onPlayGuessDestination={() => setIsArcadeOpen(true)}
        isAirportLocked={isPlayingGame}
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
          isPickingLocked={isPlayingGame}
          isCardAtBottom={isCardOpen}
          onReady={() => setIsMapReady(true)}
        />
        {selectedFlight && !isArcadeOpen && (
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
        {/* min(): 900px wide on desktop, but never wider than the screen minus a margin on phones.
            On a phone the card takes the bottom of the screen, so the controls hide behind it. */}
        <div
          className={`absolute bottom-4 left-1/2 z-10 w-[min(820px,calc(100%-24px))] -translate-x-1/2 rounded-3xl border border-white/10 bg-panel/85 px-4 py-3 shadow-card backdrop-blur-md sm:bottom-8 sm:block sm:px-6 sm:py-4 ${isCardOpen ? "hidden" : ""}`}
        >
          <TimeBar
            {...playback}
            isRadioSlowMotion={isRadioSlowMotion && !isGameOn}
            isLocked={isPlayingGame}
          />
        </div>
        {isArcadeOpen && (
          <GuessDestinationCard
            game={guessDestination}
            plane={selectedPlane}
            airportCode={airportCode}
            onClose={() => {
              guessDestination.abandon();
              setIsArcadeOpen(false);
              selectPlane(null);
            }}
          />
        )}
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
