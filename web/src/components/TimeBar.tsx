import { LAST_SECOND, type Playback, SPEEDS } from "../hooks/usePlayback";
import { formatClock } from "../utils/format";
import { ToggleButton } from "./ToggleButton";

/** Play/pause, UTC clock, time-of-day slider and speed buttons. */
export function TimeBar({
  time,
  isPlaying,
  speed,
  togglePlay,
  seek,
  setSpeed,
}: Playback) {
  return (
    <div className="flex flex-1 flex-wrap items-center gap-4">
      <button
        type="button"
        className="size-9 shrink-0 cursor-pointer rounded-full border border-neon text-neon"
        aria-label={isPlaying ? "Pause" : "Play"}
        title="Play/pause (Space)"
        onClick={togglePlay}
      >
        {isPlaying ? "❚❚" : "▶"}
      </button>
      <span className="text-muted tabular-nums">
        <output className="text-lg text-fg">{formatClock(time)}</output> UTC
      </span>
      <input
        type="range"
        className="min-w-40 flex-1 cursor-pointer accent-neon"
        min={0}
        max={LAST_SECOND}
        step={1}
        value={Math.floor(time)}
        aria-label="Time of day"
        onChange={(event) => seek(Number(event.target.value))}
      />
      <fieldset className="flex gap-1.5" aria-label="Playback speed">
        {SPEEDS.map((speedOption, index) => (
          <ToggleButton
            key={speedOption}
            pressed={speedOption === speed}
            title={`${speedOption}x speed (key ${index + 1})`}
            onClick={() => setSpeed(speedOption)}
          >
            {speedOption}x
          </ToggleButton>
        ))}
      </fieldset>
    </div>
  );
}
