import { useCallback, useEffect, useState } from "react";

const SECONDS_PER_DAY = 86400;
export const LAST_SECOND = SECONDS_PER_DAY - 1;
export const SPEEDS = [1, 2, 4, 8, 16];

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
 */
export function usePlayback(): Playback {
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);

  // Advance the clock on every animation frame while playing.
  useEffect(() => {
    if (!isPlaying) return;
    let frameId = 0;
    let lastTimestamp = performance.now();
    const onAnimationFrame = (timestamp: number) => {
      const realSecondsElapsed = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;
      setTime((current) =>
        Math.min(current + realSecondsElapsed * speed, LAST_SECOND),
      );
      frameId = requestAnimationFrame(onAnimationFrame);
    };
    frameId = requestAnimationFrame(onAnimationFrame);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, speed]);

  // Stop at the end of the day.
  useEffect(() => {
    if (time >= LAST_SECOND) setIsPlaying(false);
  }, [time]);

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

  return { time, isPlaying, speed, togglePlay, seek: setTime, setSpeed };
}
