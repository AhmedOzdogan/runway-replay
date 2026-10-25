import { useEffect, useMemo, useRef, useState } from "react";
import {
  TbBuildingBroadcastTower,
  TbLoader2,
  TbUserCircle,
  TbVolume,
  TbVolumeOff,
} from "react-icons/tb";
import type { RadioLine } from "../flights/radioScript";
import type { RadioVoice } from "../hooks/useRadioVoice";
import {
  isVoiceSupported,
  type LineVoiceState,
  lineVoiceState,
} from "../sound/radioVoicePlan";
import { formatClock } from "../utils/format";
import { hasAcceptedVoice, VoiceConsentDialog } from "./VoiceConsentDialog";

interface RadioTranscriptProps {
  /** The lines said so far, oldest first. */
  lines: RadioLine[];
  /** The replay clock, to tell a line still coming from one the replay has passed. */
  time: number;
  voice: Pick<
    RadioVoice,
    | "status"
    | "progress"
    | "loadStage"
    | "errorMessage"
    | "readyLineKeys"
    | "spokenLineKeys"
    | "toggle"
  >;
}

/**
 * The simulated radio conversation as chat bubbles: captain on the left, ATC on the right.
 * Scrolls down by itself when a new line arrives.
 */
export function RadioTranscript({ lines, time, voice }: RadioTranscriptProps) {
  const listRef = useRef<HTMLOListElement>(null);

  // Keep the newest line in view whenever one is added (or removed by scrubbing back). Scrolling
  // the line rather than the list: on a phone the card scrolls, on desktop the list does.
  useEffect(() => {
    if (lines.length === 0) return;
    listRef.current?.lastElementChild?.scrollIntoView({ block: "nearest" });
  }, [lines.length]);

  return (
    <section aria-label="Radio" className="mt-3 border-t border-line pt-3">
      <h2 className="mb-2 flex items-center justify-between text-[11px] tracking-wider text-muted uppercase">
        <span>📻 Radio</span>
        <span className="flex items-center gap-2 normal-case tracking-normal">
          <span className="rounded-full border border-line px-1.5 py-px text-[10px]">
            Simulated
          </span>
          {voice.status === "on" && (
            <span className="flex items-center gap-2 text-[10px] text-muted">
              {(["ready", "generating", "skipped"] as const).map((state) => (
                <span key={state} className="flex items-center gap-1">
                  <span
                    className={`size-1.5 rounded-full ${DOT_CLASSES[state]}`}
                  />
                  {state}
                </span>
              ))}
            </span>
          )}
          <VoiceButton voice={voice} />
        </span>
      </h2>

      {voice.status === "error" && (
        <p
          // The raw error (out of memory, no backend…) means nothing to a visitor; keep it in the
          // tooltip so it's still there when someone reports the problem.
          title={voice.errorMessage ?? undefined}
          className="mb-2 rounded-lg border border-line bg-night/60 px-2 py-1 text-[11px] text-muted"
        >
          The radio voice isn't supported on this device yet — the transcript
          still works.
        </p>
      )}

      {lines.length === 0 ? (
        <p className="text-xs text-muted italic">Listening…</p>
      ) : (
        <ol
          ref={listRef}
          // On a phone the card itself scrolls; a second scroll area inside it traps the transcript.
          className="flex flex-col gap-2 sm:max-h-56 sm:overflow-y-auto sm:pr-1"
        >
          {lines.map((line) => {
            const isAtc = line.speaker === "ATC";
            return (
              <li
                key={`${line.time}-${line.speaker}`}
                className={`flex flex-col gap-0.5 motion-safe:animate-pop ${isAtc ? "items-end" : "items-start"}`}
              >
                <span className="flex items-center gap-1 text-[10px] text-muted">
                  {voice.status === "on" && (
                    <VoiceStateDot
                      state={lineVoiceState(
                        line,
                        time,
                        voice.readyLineKeys,
                        voice.spokenLineKeys,
                      )}
                    />
                  )}
                  {isAtc ? (
                    <TbBuildingBroadcastTower size={12} aria-hidden="true" />
                  ) : (
                    <TbUserCircle size={12} aria-hidden="true" />
                  )}
                  {isAtc ? "ATC" : "Captain"} · {formatClock(line.time)}
                </span>
                <p
                  className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-xs leading-snug ${
                    isAtc
                      ? "rounded-br-sm bg-neon/15 text-fg"
                      : "rounded-bl-sm bg-white/8 text-fg"
                  }`}
                >
                  {line.text}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

/** Dot styles per state; the legend in the header uses the same classes. */
const DOT_CLASSES: Record<LineVoiceState, string> = {
  spoken: "bg-neon shadow-neon",
  ready: "bg-neon shadow-neon",
  // Amber and blinking: a hollow grey dot read too much like the grey "skipped" one.
  generating: "bg-amber motion-safe:animate-pulse",
  skipped: "bg-line ring-1 ring-muted/40",
};

const DOT_LABELS: Record<LineVoiceState, string> = {
  spoken: "Said",
  ready: "Ready to play",
  generating: "Still generating",
  skipped: "Skipped: it wasn't ready in time",
};

/**
 * Shows what the voice did with a line. Decorative: the transcript already carries the words, and
 * a dot announced before each one would only be noise in a screen reader.
 */
function VoiceStateDot({ state }: { state: LineVoiceState }) {
  return (
    <span
      title={DOT_LABELS[state]}
      aria-hidden="true"
      className={`size-1.5 shrink-0 rounded-full ${DOT_CLASSES[state]}`}
    />
  );
}

const VOICE_LABELS: Record<RadioVoice["status"], string> = {
  off: "Turn on the radio voice (downloads ~90 MB once from huggingface.co)",
  loading: "Getting the radio voice ready…",
  on: "Turn off the radio voice",
  error: "The radio voice couldn't load. Click to try again.",
};

/** Off by default: the first click downloads the voice model, after that it's cached. */
function VoiceButton({
  voice,
}: {
  voice: Pick<RadioVoice, "status" | "progress" | "loadStage" | "toggle">;
}) {
  const { status, progress, loadStage, toggle } = voice;
  // Switching the voice on the first time downloads ~92 MB, so ask before spending someone's data.
  const [isAsking, setIsAsking] = useState(false);
  // Phones and tablets can't run the model (see docs/radio-voice.md), so don't offer the download.
  const isSupported = useMemo(
    () => isVoiceSupported(window.matchMedia("(pointer: coarse)").matches),
    [],
  );

  if (!isSupported) {
    return (
      <span
        title="The HD radio voice needs a desktop browser. The transcript works everywhere."
        className="text-[10px] text-muted"
      >
        Voice: desktop only
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-pressed={status === "on"}
        aria-label={VOICE_LABELS[status]}
        title={VOICE_LABELS[status]}
        onClick={() => {
          if (status === "off" && !hasAcceptedVoice()) setIsAsking(true);
          else toggle();
        }}
        disabled={status === "loading"}
        className="flex h-6 cursor-pointer items-center gap-1 rounded-full px-1.5 text-[10px] text-muted transition-colors hover:bg-white/5 hover:text-fg disabled:cursor-wait aria-pressed:text-neon"
      >
        {status === "loading" ? (
          <>
            <TbLoader2
              size={14}
              className="motion-safe:animate-spin"
              aria-hidden="true"
            />
            {loadStage === "preparing" ? "Preparing…" : `${progress}%`}
          </>
        ) : status === "on" ? (
          <TbVolume size={16} aria-hidden="true" />
        ) : (
          <>
            <TbVolumeOff size={16} aria-hidden="true" />
            {status === "error" ? "Retry" : "Voice"}
          </>
        )}
      </button>
      <VoiceConsentDialog
        isOpen={isAsking}
        onClose={() => setIsAsking(false)}
        onAccept={() => {
          setIsAsking(false);
          toggle(); // still inside the click, which is what iOS needs to allow audio
        }}
      />
    </>
  );
}
