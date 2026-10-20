import { useEffect, useRef } from "react";
import { TbBuildingBroadcastTower, TbUserCircle } from "react-icons/tb";
import type { RadioLine } from "../flights/radioScript";
import { formatClock } from "../utils/format";

interface RadioTranscriptProps {
  /** The lines said so far, oldest first. */
  lines: RadioLine[];
}

/**
 * The simulated radio conversation as chat bubbles: captain on the left, ATC on the right.
 * Scrolls down by itself when a new line arrives.
 */
export function RadioTranscript({ lines }: RadioTranscriptProps) {
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
        <span className="rounded-full border border-line px-1.5 py-px text-[10px] normal-case tracking-normal">
          Simulated
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
