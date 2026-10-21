// Pure decisions for the Kokoro radio voice, kept apart from the browser audio code so they can
// be unit-tested: which voice speaks, which lines to prepare, how far the download is, and the
// distortion curve that gives the radio its crunchy sound.

import type { Speaker } from "../data/radioPhrases";
import type { RadioLine } from "../flights/radioScript";

/** The Kokoro model on Hugging Face (Apache-2.0). Downloaded once, then cached by the browser. */
export const KOKORO_MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
/** 8-bit quantized model: ~92 MB, much smaller than full precision and still clear. */
export const KOKORO_DTYPE = "q8";

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
