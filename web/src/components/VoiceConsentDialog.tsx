import { useEffect, useRef } from "react";

/** Remembering a yes keeps the dialog out of the way; a no is never remembered, so it asks again. */
const ACCEPTED_KEY = "runway-replay.voice-accepted";

export function hasAcceptedVoice(): boolean {
  try {
    return localStorage.getItem(ACCEPTED_KEY) === "yes";
  } catch {
    return false; // private mode, or storage blocked: ask every time rather than fail
  }
}

function rememberAcceptedVoice() {
  try {
    localStorage.setItem(ACCEPTED_KEY, "yes");
  } catch {
    // Not being able to remember is not a reason to refuse the download.
  }
}

/** True when the browser says the connection is metered or slow, so the warning can be firmer. */
function isOnCostlyConnection(): boolean {
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (!connection) return false; // Safari and Firefox don't tell us; the plain warning still shows
  return (
    connection.saveData === true ||
    connection.effectiveType === "2g" ||
    connection.effectiveType === "slow-2g" ||
    connection.effectiveType === "3g"
  );
}

interface VoiceConsentDialogProps {
  isOpen: boolean;
  /** Runs inside the button's click, so the AudioContext iOS needs is still created in a gesture. */
  onAccept: () => void;
  onClose: () => void;
}

/**
 * Asked once before the radio voice downloads: what it costs and what happens to the audio.
 * Native <dialog>, like AboutDialog, so focus, Esc and screen readers are handled by the browser.
 */
export function VoiceConsentDialog({
  isOpen,
  onAccept,
  onClose,
}: VoiceConsentDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the click only closes on the backdrop; keyboard users close with Esc (native to <dialog>) or the Not now button.
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      aria-labelledby="voice-consent-title"
      className="m-auto w-[min(420px,calc(100vw-24px))] rounded-2xl border border-line bg-panel p-5 text-sm text-fg shadow-card backdrop:bg-night/70 backdrop:backdrop-blur-sm"
    >
      <h2 id="voice-consent-title" className="text-base font-semibold">
        Turn on the radio voice?
      </h2>

      <ul className="my-4 flex list-none flex-col gap-2.5 leading-relaxed text-fg/90">
        <li>
          <strong className="text-neon">One download of about 90 MB</strong>{" "}
          from huggingface.co. Your browser caches it, so it only happens once.
        </li>
        {isOnCostlyConnection() && (
          <li className="text-amber">
            Your connection looks slow or metered — this may take a while and
            use a chunk of your data plan.
          </li>
        )}
        <li>
          <strong className="text-neon">Nothing is collected.</strong> The
          speech is generated on your device; no audio and no text leaves your
          browser, and Runway Replay has no backend to send it to.
        </li>
      </ul>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-full border border-line px-4 py-1.5 text-muted hover:border-muted hover:text-fg"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={() => {
            rememberAcceptedVoice();
            onAccept();
          }}
          className="cursor-pointer rounded-full border border-neon bg-neon px-4 py-1.5 font-semibold text-night shadow-neon"
        >
          Download and turn on
        </button>
      </div>
    </dialog>
  );
}
