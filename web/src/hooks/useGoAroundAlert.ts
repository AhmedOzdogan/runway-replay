import { useEffect, useRef, useState } from "react";
import type { Flight } from "../types/flight";

const ALERT_VISIBLE_MS = 6000;
/** Largest time step (s) between renders that still counts as playing; bigger jumps are slider moves. */
const MAX_PLAYBACK_STEP_SECONDS = 120;

/**
 * The flight whose go-around the replay just played through, for a few seconds; null otherwise.
 * Jumping past a go-around with the slider doesn't trigger it.
 */
export function useGoAroundAlert(
  flights: Flight[],
  time: number,
): { alert: Flight | null; dismiss: () => void } {
  const [alert, setAlert] = useState<Flight | null>(null);
  const previousTime = useRef(time);

  useEffect(() => {
    const before = previousTime.current;
    previousTime.current = time;
    const isPlayingForward =
      time > before && time - before < MAX_PLAYBACK_STEP_SECONDS;
    if (!isPlayingForward) return;
    const crossed = flights.find(
      (flight) =>
        flight.goAroundAt !== undefined &&
        flight.goAroundAt > before &&
        flight.goAroundAt <= time,
    );
    if (crossed) setAlert(crossed);
  }, [flights, time]);

  // A new day or airport: drop any alert from the old one.
  useEffect(() => {
    if (flights) setAlert(null);
  }, [flights]);

  useEffect(() => {
    if (!alert) return;
    const hideTimer = setTimeout(() => setAlert(null), ALERT_VISIBLE_MS);
    return () => clearTimeout(hideTimer);
  }, [alert]);

  return { alert, dismiss: () => setAlert(null) };
}
