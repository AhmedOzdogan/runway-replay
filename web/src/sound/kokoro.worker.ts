// Runs the Kokoro text-to-speech model in a background thread, so generating speech never makes
// the 60 fps replay stutter. The library is only imported here, when the voice is switched on.

import type { KokoroTTS } from "kokoro-js";
import { createSerialQueue } from "../utils/serialQueue";
import { KOKORO_DTYPE, KOKORO_MODEL_ID } from "./radioVoicePlan";

/** Messages from the page to this worker. */
export type ToWorker =
  | { type: "load" }
  | {
      type: "generate";
      id: number;
      text: string;
      voice: string;
      speed: number;
    };

/** Messages from this worker back to the page. */
export type FromWorker =
  | {
      type: "progress";
      report: {
        status: string;
        file?: string;
        loaded?: number;
        total?: number;
      };
    }
  | { type: "ready" }
  | { type: "loadError"; message: string }
  | { type: "audio"; id: number; samples: Float32Array; sampleRate: number }
  | { type: "generateError"; id: number; message: string };

// The worker's global scope, typed just enough for what we use.
const worker = self as unknown as {
  postMessage(message: FromWorker, transfer?: Transferable[]): void;
  onmessage: ((event: MessageEvent<ToWorker>) => void) | null;
};

/** The voice names kokoro-js accepts, e.g. "af_bella". */
type KokoroVoice = NonNullable<Parameters<KokoroTTS["generate"]>[1]>["voice"];

let tts: KokoroTTS | null = null;

// One generation at a time: running several at once on the same model slows them all down and
// makes some fail.
const oneAtATime = createSerialQueue();

async function load(): Promise<void> {
  try {
    const { KokoroTTS } = await import("kokoro-js");
    tts = await KokoroTTS.from_pretrained(KOKORO_MODEL_ID, {
      dtype: KOKORO_DTYPE,
      device: "wasm",
      progress_callback: (report) =>
        worker.postMessage({ type: "progress", report }),
    });
    worker.postMessage({ type: "ready" });
  } catch (error) {
    worker.postMessage({ type: "loadError", message: String(error) });
  }
}

async function generate(
  id: number,
  text: string,
  voice: string,
  speed: number,
): Promise<void> {
  try {
    if (!tts) throw new Error("The voice model isn't loaded yet");
    const audio = await tts.generate(text, {
      voice: voice as KokoroVoice,
      speed,
    });
    const samples = audio.audio as Float32Array;
    // Transfer the buffer instead of copying it: the page owns it from now on.
    worker.postMessage(
      { type: "audio", id, samples, sampleRate: audio.sampling_rate },
      [samples.buffer],
    );
  } catch (error) {
    worker.postMessage({ type: "generateError", id, message: String(error) });
  }
}

worker.onmessage = (event) => {
  const message = event.data;
  if (message.type === "load") void load();
  else
    void oneAtATime(() =>
      generate(message.id, message.text, message.voice, message.speed),
    );
};
