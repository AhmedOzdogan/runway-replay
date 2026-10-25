import { type MouseEvent, useState } from "react";
import {
  TbPlayerPauseFilled,
  TbPlayerPlayFilled,
  TbRadio,
  TbRewindBackward60,
  TbRewindForward60,
} from "react-icons/tb";
import {
  LAST_SECOND,
  type Playback,
  SKIP_SECONDS,
  SPEEDS,
} from "../hooks/usePlayback";
import { formatClock } from "../utils/format";

/** Labels under the timeline, every six hours. */
const HOUR_MARKS = ["00:00", "06:00", "12:00", "18:00", "24:00"];

const SKIP_BUTTON_CLASSES =
  "flex size-10 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-white/5 hover:text-fg";

/**
 * Media-player style controls: a timeline across the day, then the clock, skip/play buttons and
 * playback speed. The timeline is a styled overlay on a real (invisible) range input, so it keeps
 * working with the keyboard and screen readers.
 */
interface TimeBarProps extends Playback {
  /** True while the radio is talking and the replay is held at 1x. */
  isRadioSlowMotion?: boolean;
  /** The arcade drives the replay itself: scrubbing or changing speed mid-question would cheat. */
  isLocked?: boolean;
}

export function TimeBar({
  time,
  isPlaying,
  speed,
  togglePlay,
  seek,
  setSpeed,
  isRadioSlowMotion = false,
  isLocked = false,
}: TimeBarProps) {
  // The speed it's actually playing at: 1x while the radio talks, otherwise the chosen one.
  const currentSpeed = isRadioSlowMotion ? 1 : speed;
  // Where the mouse is over the timeline: the time it points at and how far along it is (0–1).
  const [hover, setHover] = useState<{ time: number; fraction: number } | null>(
    null,
  );
  const progressPercent = (time / LAST_SECOND) * 100;

  function showHoverTime(event: MouseEvent<HTMLInputElement>) {
    const timeline = event.currentTarget.getBoundingClientRect();
    const fraction = Math.min(
      Math.max((event.clientX - timeline.left) / timeline.width, 0),
      1,
    );
    setHover({ time: fraction * LAST_SECOND, fraction });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Timeline */}
      <div>
        <div className="group relative flex h-5 items-center rounded-full has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-neon/50">
          <div className="h-1 w-full rounded-full bg-line transition-[height] group-hover:h-1.5">
            <div
              className="h-full rounded-full bg-neon shadow-neon"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div
            className="pointer-events-none absolute size-3.5 -translate-x-1/2 rounded-full bg-white shadow-neon transition-transform group-hover:scale-125"
            style={{ left: `${progressPercent}%` }}
          />
          {hover && (
            <span
              className="pointer-events-none absolute bottom-full mb-2 -translate-x-1/2 rounded-md border border-line bg-night px-2 py-0.5 text-xs text-fg tabular-nums"
              style={{ left: `${hover.fraction * 100}%` }}
            >
              {formatClock(hover.time)}
            </span>
          )}
          <input
            type="range"
            disabled={isLocked}
            className="absolute inset-0 w-full cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed [&::-moz-range-thumb]:size-0 [&::-moz-range-thumb]:border-0 [&::-webkit-slider-thumb]:size-0 [&::-webkit-slider-thumb]:appearance-none"
            min={0}
            max={LAST_SECOND}
            step={1}
            value={Math.floor(time)}
            aria-label="Time of day"
            aria-valuetext={`${formatClock(time)} UTC`}
            onChange={(event) => seek(Number(event.target.value))}
            onMouseMove={showHoverTime}
            onMouseLeave={() => setHover(null)}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted tabular-nums">
          {HOUR_MARKS.map((mark) => (
            <span key={mark}>{mark}</span>
          ))}
        </div>
      </div>

      {/* Phones: play controls on their own centred row, then clock (left) and speed (right).
          From sm up: three columns, with the play controls exactly in the middle. */}
      <div
        className={`flex flex-wrap items-center justify-between gap-y-3 sm:grid sm:grid-cols-[1fr_auto_1fr] ${isLocked ? "opacity-60" : ""}`}
      >
        <div className="order-first flex w-full items-center justify-center gap-3 sm:order-none sm:col-start-2 sm:w-auto">
          <button
            type="button"
            className={SKIP_BUTTON_CLASSES}
            aria-label="Back 1 minute"
            title="Back 1 minute"
            disabled={isLocked}
            onClick={() => seek(time - SKIP_SECONDS)}
          >
            <TbRewindBackward60 size={24} />
          </button>
          <button
            type="button"
            className="flex size-12 cursor-pointer items-center justify-center rounded-full bg-neon text-night shadow-neon transition-transform hover:scale-105 active:scale-95"
            aria-label={isPlaying ? "Pause" : "Play"}
            title={
              isLocked ? "The arcade is flying this one" : "Play/pause (Space)"
            }
            disabled={isLocked}
            onClick={togglePlay}
          >
            {isPlaying ? (
              <TbPlayerPauseFilled size={22} />
            ) : (
              <TbPlayerPlayFilled size={22} />
            )}
          </button>
          <button
            type="button"
            className={SKIP_BUTTON_CLASSES}
            aria-label="Forward 1 minute"
            title="Forward 1 minute"
            disabled={isLocked}
            onClick={() => seek(time + SKIP_SECONDS)}
          >
            <TbRewindForward60 size={24} />
          </button>
        </div>

        <div className="tabular-nums sm:col-start-1 sm:row-start-1">
          <output className="text-lg font-semibold text-fg">
            {formatClock(time)}
          </output>
          <span className="ml-1 text-xs text-muted">UTC</span>
          {isRadioSlowMotion && (
            <span
              // Icon only on phones: the full label pushed the speed buttons onto their own row.
              className="ml-2 inline-flex items-center gap-1 rounded-full bg-neon/15 px-1.5 py-0.5 align-middle text-[11px] text-neon sm:px-2"
              title="Slowed down to 1x while the radio is talking"
            >
              <TbRadio size={12} aria-hidden="true" />
              <span className="hidden sm:inline">Radio · 1x</span>
            </span>
          )}
        </div>

        <fieldset
          disabled={isLocked}
          className="flex rounded-full border border-line bg-night/60 p-0.5 disabled:opacity-50 sm:col-start-3 sm:row-start-1 sm:justify-self-end"
          aria-label="Playback speed"
        >
          {SPEEDS.map((speedOption, index) => {
            // Highlight the speed it's really playing at; while the radio holds it at 1x,
            // outline the chosen speed it will return to.
            const isWaitingToResume =
              isRadioSlowMotion &&
              speedOption === speed &&
              speed !== currentSpeed;
            return (
              <button
                key={speedOption}
                type="button"
                aria-pressed={speedOption === currentSpeed}
                title={
                  isWaitingToResume
                    ? `${speedOption}x speed, resumes after the radio (key ${index + 1})`
                    : `${speedOption}x speed (key ${index + 1})`
                }
                onClick={() => setSpeed(speedOption)}
                className={`cursor-pointer rounded-full px-2.5 py-1 text-xs text-muted transition-colors hover:text-fg aria-pressed:bg-neon aria-pressed:font-semibold aria-pressed:text-night ${
                  isWaitingToResume
                    ? "text-neon ring-1 ring-neon/60 ring-inset"
                    : ""
                }`}
              >
                {speedOption}x
              </button>
            );
          })}
        </fieldset>
      </div>
    </div>
  );
}
