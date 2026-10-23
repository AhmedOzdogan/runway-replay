// Pure decisions for the Kokoro radio voice, kept apart from the browser audio code so they can
// be unit-tested: which voice speaks, which lines to prepare, how far the download is, and the
// distortion curve that gives the radio its crunchy sound.

import type { Speaker } from "../data/radioPhrases";
import { LINE_TALK_SECONDS, type RadioLine } from "../flights/radioScript";

/** The Kokoro model on Hugging Face (Apache-2.0). Downloaded once, then cached by the browser. */
export const KOKORO_MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";

/**
 * 8-bit quantized model on WebAssembly: ~90 MB and clear. WebGPU with q4f16 generates faster on
 * paper, but produced no usable audio here, so it stays off until it's been tested properly.
 */
export const KOKORO_DTYPE = "q8";
export const KOKORO_DEVICE = "wasm";

/** Said once right after loading, so the first real line doesn't pay for the model warming up. */
export const WARM_UP_TEXT = "Radio check.";

/** A different voice for each side, so you can hear who's talking. Grades from the model card. */
export const KOKORO_VOICES: Record<Speaker, { voice: string; speed: number }> =
  {
    // Real radio talk is fast and clipped; 1 is Kokoro's normal speaking speed.
    ATC: { voice: "af_bella", speed: 1.3 }, // American female, grade A-
    PILOT: { voice: "am_michael", speed: 1.25 }, // American male, grade C+
  };

/** How many upcoming lines to generate ahead, so they're ready when the replay reaches them. */
export const PREPARE_AHEAD_COUNT = 3;

/** Identifies a line's audio: the same spoken words by the same speaker sound the same. */
export function lineKey(line: RadioLine): string {
  return `${line.speaker}|${line.spoken}`;
}

/**
 * After a jump (slider, ±1 min, picking a flight from the search), how far back a line may have
 * started and still be worth saying: you land mid-conversation, so the last thing said is the
 * context you need. Older than this and the replay has moved on, so it stays quiet.
 */
export const SEEK_CATCHUP_SECONDS = 15;

/**
 * Generating a line takes about a second, sometimes more on a phone. If the replay has moved on
 * by more than this while it was being generated, speaking it would talk over what comes next, so
 * it is dropped instead.
 */
export const MAX_LATE_MILLISECONDS = 1500;

/** True when a line finished generating too late to still be worth speaking. */
export function isTooLate(
  dueAtMilliseconds: number,
  nowMilliseconds: number,
  maxLate = MAX_LATE_MILLISECONDS,
): boolean {
  return nowMilliseconds - dueAtMilliseconds > maxLate;
}

/** The line to speak after jumping to `time`: the last one said, if it was said just now. */
export function lineAtSeek(
  lines: RadioLine[],
  time: number,
  withinSeconds = SEEK_CATCHUP_SECONDS,
): RadioLine | null {
  const said = lines.filter(
    (line) => line.time <= time && time - line.time <= withinSeconds,
  );
  return said.length > 0 ? said[said.length - 1] : null;
}

/** The next `count` lines after `time`, to generate before the replay gets there. */
export function upcomingLines(
  lines: RadioLine[],
  time: number,
  count = PREPARE_AHEAD_COUNT,
): RadioLine[] {
  return lines.filter((line) => line.time > time).slice(0, count);
}

/** Bytes downloaded so far per file, as reported by the model loader. */
export type DownloadProgress = Record<
  string,
  { loaded: number; total: number }
>;

/** Update the per-file progress with one report from the loader (other statuses are ignored). */
export function trackDownload(
  progress: DownloadProgress,
  report: { status: string; file?: string; loaded?: number; total?: number },
): DownloadProgress {
  if (report.status !== "progress" || !report.file || !report.total) {
    return progress;
  }
  return {
    ...progress,
    [report.file]: { loaded: report.loaded ?? 0, total: report.total },
  };
}

/** Overall download percentage (0–100) across all files seen so far. */
export function downloadPercent(progress: DownloadProgress): number {
  const files = Object.values(progress);
  const total = files.reduce((sum, file) => sum + file.total, 0);
  if (total === 0) return 0;
  const loaded = files.reduce(
    (sum, file) => sum + Math.min(file.loaded, file.total),
    0,
  );
  return Math.round((loaded / total) * 100);
}

/**
 * A soft-clipping curve for a WaveShaper: quiet sounds pass almost unchanged, loud ones get
 * squashed, which adds the slightly overdriven sound of a real aircraft radio.
 * Values stay in -1…1, rise steadily, and are symmetric around zero.
 */
export function radioDistortionCurve(amount = 3, size = 1024): Float32Array {
  const curve = new Float32Array(size);
  for (let index = 0; index < size; index++) {
    const x = (index * 2) / (size - 1) - 1; // -1 … 1
    curve[index] = Math.tanh(amount * x) / Math.tanh(amount);
  }
  return curve;
}

/** What the voice managed to do with one line, for the dots in the transcript. */
export type LineVoiceState = "spoken" | "ready" | "generating" | "skipped";

/**
 * A line is "skipped" once its moment has passed without being spoken: generating it took longer
 * than the replay waited, and saying it now would talk over what comes next.
 */
export function lineVoiceState(
  line: RadioLine,
  time: number,
  readyKeys: ReadonlySet<string>,
  spokenKeys: ReadonlySet<string>,
  talkSeconds = LINE_TALK_SECONDS,
): LineVoiceState {
  const key = lineKey(line);
  if (spokenKeys.has(key)) return "spoken";
  if (time >= line.time + talkSeconds) return "skipped";
  return readyKeys.has(key) ? "ready" : "generating";
}
