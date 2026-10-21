import { describe, expect, it } from "vitest";
import type { RadioLine } from "../../../src/flights/radioScript";
import {
  downloadPercent,
  KOKORO_VOICES,
  lineKey,
  radioDistortionCurve,
  trackDownload,
  upcomingLines,
} from "../../../src/sound/radioVoicePlan";

const lines: RadioLine[] = [
  { time: 100, speaker: "ATC", text: "one", spoken: "one" },
  { time: 106, speaker: "PILOT", text: "two", spoken: "two" },
  { time: 112, speaker: "ATC", text: "three", spoken: "three" },
  { time: 500, speaker: "ATC", text: "four", spoken: "four" },
  { time: 506, speaker: "PILOT", text: "five", spoken: "five" },
];

describe("KOKORO_VOICES", () => {
  it("gives ATC and the captain different voices", () => {
    expect(KOKORO_VOICES.ATC.voice).not.toBe(KOKORO_VOICES.PILOT.voice);
  });
});

describe("lineKey", () => {
  it("is the same for the same words by the same speaker", () => {
    expect(lineKey(lines[0])).toBe(lineKey({ ...lines[0], time: 999 }));
  });

  it("differs when the speaker differs", () => {
    expect(lineKey(lines[0])).not.toBe(
      lineKey({ ...lines[0], speaker: "PILOT" }),
    );
  });
});

describe("upcomingLines", () => {
  it("returns the next lines after now, in order", () => {
    expect(upcomingLines(lines, 100, 3).map((line) => line.text)).toEqual([
      "two",
      "three",
      "four",
    ]);
  });

  it("never returns lines that were already said", () => {
    expect(upcomingLines(lines, 112).map((line) => line.text)).toEqual([
      "four",
      "five",
    ]);
  });

  it("returns nothing after the last line", () => {
    expect(upcomingLines(lines, 600)).toEqual([]);
  });
});

describe("trackDownload and downloadPercent", () => {
  it("starts at 0 before anything is known", () => {
    expect(downloadPercent({})).toBe(0);
  });

  it("combines several files by their sizes", () => {
    let progress = trackDownload(
      {},
      { status: "progress", file: "model.onnx", loaded: 50, total: 100 },
    );
    progress = trackDownload(progress, {
      status: "progress",
      file: "voice.bin",
      loaded: 0,
      total: 100,
    });
    expect(downloadPercent(progress)).toBe(25);
  });

  it("ignores reports that aren't download progress", () => {
    const progress = trackDownload(
      {},
      { status: "initiate", file: "model.onnx" },
    );
    expect(progress).toEqual({});
  });

  it("reaches 100 when every file is complete", () => {
    const progress = trackDownload(
      {},
      { status: "progress", file: "model.onnx", loaded: 100, total: 100 },
    );
    expect(downloadPercent(progress)).toBe(100);
  });
});

describe("radioDistortionCurve", () => {
  const curve = radioDistortionCurve(20, 101);

  it("stays within -1 … 1", () => {
    for (const value of curve) {
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("rises steadily, so louder input never comes out quieter", () => {
    for (let index = 1; index < curve.length; index++) {
      expect(curve[index]).toBeGreaterThanOrEqual(curve[index - 1]);
    }
  });

  it("is symmetric around zero", () => {
    expect(curve[50]).toBeCloseTo(0);
    expect(curve[0]).toBeCloseTo(-curve[100]);
  });
});
