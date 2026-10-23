import { useEffect, useRef, useState } from "react";
import {
  TbBuildingBroadcastTower,
  TbLoader2,
  TbUserCircle,
  TbVolume,
  TbVolumeOff,
} from "react-icons/tb";
import type { RadioLine } from "../flights/radioScript";
import type { RadioVoice } from "../hooks/useRadioVoice";
import { formatClock } from "../utils/format";
import { hasAcceptedVoice, VoiceConsentDialog } from "./VoiceConsentDialog";

interface RadioTranscriptProps {
  /** The lines said so far, oldest first. */
  lines: RadioLine[];
  voice: Pick<RadioVoice, "status" | "progress" | "toggle">;
}

/**
 * The simulated radio conversation as chat bubbles: captain on the left, ATC on the right.
 * Scrolls down by itself when a new line arrives.
 */
export function RadioTranscript({ lines, voice }: RadioTranscriptProps) {
  const listRef = useRef<HTMLOListElement>(null);

  // Keep the newest line in view whenever one is added (or removed by scrubbing back).
  useEffect(() => {
    const list = listRef.current;
    if (list && lines.length > 0) list.scrollTop = list.scrollHeight;
  }, [lines.length]);

  return (
    <section aria-label="Radio" className="mt-3 border-t border-line pt-3">
      <h2 className="mb-2 flex items-center justify-between text-[11px] tracking-wider text-muted uppercase">
        <span>📻 Radio</span>
        <span className="flex items-center gap-2 normal-case tracking-normal">
          <span className="rounded-full border border-line px-1.5 py-px text-[10px]">
            Simulated
          </span>
          <VoiceButton voice={voice} />
        </span>
      </h2>

      {lines.length === 0 ? (
        <p className="text-xs text-muted italic">Listening…</p>
      ) : (
        <ol
          ref={listRef}
          className="flex max-h-56 flex-col gap-2 overflow-y-auto pr-1"
        >
          {lines.map((line) => {
            const isAtc = line.speaker === "ATC";
            return (
              <li
                key={`${line.time}-${line.speaker}`}
                className={`flex flex-col gap-0.5 motion-safe:animate-pop ${isAtc ? "items-end" : "items-start"}`}
              >
                <span className="flex items-center gap-1 text-[10px] text-muted">
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

const VOICE_LABELS: Record<RadioVoice["status"], string> = {
  off: "Turn on the radio voice (downloads ~90 MB once from huggingface.co)",
  loading: "Downloading the radio voice…",
  on: "Turn off the radio voice",
  error: "The radio voice couldn't load. Click to try again.",
};

/** Off by default: the first click downloads the voice model, after that it's cached. */
function VoiceButton({
  voice,
}: {
  voice: Pick<RadioVoice, "status" | "progress" | "toggle">;
}) {
  const { status, progress, toggle } = voice;
  // Switching the voice on the first time downloads ~92 MB, so ask before spending someone's data.
  const [isAsking, setIsAsking] = useState(false);
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
            {progress}%
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
