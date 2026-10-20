import { useCallback, useEffect, useState } from "react";

const SECONDS_PER_DAY = 86400;
export const LAST_SECOND = SECONDS_PER_DAY - 1;
export const SPEEDS = [1, 2, 4, 8, 16];
export const SKIP_SECONDS = 60; // how far the −1 min / +1 min buttons jump

export interface Playback {
  /** Seconds since 00:00 UTC, the same TIME as in the data points. */
  time: number;
  isPlaying: boolean;
  speed: number;
  togglePlay: () => void;
  seek: (time: number) => void;
  setSpeed: (speed: number) => void;
}

/**
 * The replay clock: plays the day at `speed` times real time and stops at midnight.
 * Keyboard: Space plays/pauses, 1–5 pick a speed from SPEEDS.
 * `maxSpeed` temporarily caps the speed (e.g. 1x while the radio talks) without changing the
 * speed the user picked, so it comes back by itself.
 */
export function usePlayback(maxSpeed = Number.POSITIVE_INFINITY): Playback {
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);

  const effectiveSpeed = Math.min(speed, maxSpeed);

  // Advance the clock on every animation frame while playing.
  useEffect(() => {
    if (!isPlaying) return;
    let frameId = 0;
    let lastTimestamp = performance.now();
    const onAnimationFrame = (timestamp: number) => {
      const realSecondsElapsed = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;
      setTime((current) =>
        Math.min(current + realSecondsElapsed * effectiveSpeed, LAST_SECOND),
      );
      frameId = requestAnimationFrame(onAnimationFrame);
    };
    frameId = requestAnimationFrame(onAnimationFrame);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, effectiveSpeed]);

  // Stop at the end of the day.
  useEffect(() => {
    if (time >= LAST_SECOND) setIsPlaying(false);
  }, [time]);

  // Every caller (slider, skip buttons, keys) goes through here, so the time always stays within the day.
  const seek = useCallback((newTime: number) => {
    setTime(Math.min(Math.max(newTime, 0), LAST_SECOND));
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((playing) => !playing);
    // Pressing play at the end of the day starts it again.
    setTime((current) => (current >= LAST_SECOND ? 0 : current));
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isTyping = target.closest(
        "textarea, select, [contenteditable], input:not([type=range])",
      );
      if (event.ctrlKey || event.metaKey || event.altKey || isTyping) return;

      if (event.code === "Space") {
        event.preventDefault(); // no page scroll
        if (!event.repeat) togglePlay();
        return;
      }
      const speedForKey = SPEEDS[Number(event.key) - 1]; // keys 1..5
      if (speedForKey) setSpeed(speedForKey);
    };
    // A focused button would also "click" on Space keyup; we already handled it on keydown.
    const onKeyUp = (event: KeyboardEvent) => {
      if (
        event.code === "Space" &&
        (event.target as HTMLElement).closest("button")
      ) {
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [togglePlay]);

  return { time, isPlaying, speed, togglePlay, seek, setSpeed };
}
