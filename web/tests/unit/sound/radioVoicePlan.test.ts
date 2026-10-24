import { describe, expect, it } from "vitest";
import type { RadioLine } from "../../../src/flights/radioScript";
import {
  downloadPercent,
  isTooLate,
  isVoiceSupported,
  KOKORO_VOICES,
  lineAtSeek,
  lineKey,
  lineVoiceState,
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

describe("lineAtSeek", () => {
  const conversation: RadioLine[] = [
    { time: 100, speaker: "ATC", text: "first", spoken: "first" },
    { time: 150, speaker: "PILOT", text: "second", spoken: "second" },
    { time: 400, speaker: "ATC", text: "third", spoken: "third" },
  ];

  it("returns the line that was just said", () => {
    expect(lineAtSeek(conversation, 160)).toEqual(conversation[1]);
  });

  it("returns nothing when the last line is long past", () => {
    expect(lineAtSeek(conversation, 300)).toBeNull();
  });

  it("returns nothing when nothing has been said yet", () => {
    expect(lineAtSeek(conversation, 50)).toBeNull();
  });

  it("never returns a line from the future", () => {
    expect(lineAtSeek(conversation, 395)).toBeNull();
  });
});

describe("isTooLate", () => {
  it("lets a line through when it generated quickly", () => {
    expect(isTooLate(1000, 1400)).toBe(false);
  });

  it("drops a line that took longer than the allowance", () => {
    expect(isTooLate(1000, 3000)).toBe(true);
  });

  it("takes the allowance as an argument", () => {
    expect(isTooLate(1000, 1400, 200)).toBe(true);
  });
});

describe("lineVoiceState", () => {
  const line: RadioLine = {
    time: 100,
    speaker: "ATC",
    text: "cleared",
    spoken: "cleared",
  };
  const key = lineKey(line);
  const none: ReadonlySet<string> = new Set();

  it("is generating while the audio isn't ready yet", () => {
    expect(lineVoiceState(line, 95, none, none)).toBe("generating");
  });

  it("is ready once the audio exists and the moment hasn't passed", () => {
    expect(lineVoiceState(line, 95, new Set([key]), none)).toBe("ready");
  });

  it("is spoken once it has been said", () => {
    expect(lineVoiceState(line, 200, new Set([key]), new Set([key]))).toBe(
      "spoken",
    );
  });

  it("is skipped when the moment passed without it being said", () => {
    expect(lineVoiceState(line, 200, new Set([key]), none)).toBe("skipped");
    expect(lineVoiceState(line, 200, none, none)).toBe("skipped");
  });
});

describe("isVoiceSupported", () => {
  it("is off on touch devices: generating a line there is slower than the replay", () => {
    expect(isVoiceSupported(true)).toBe(false);
  });

  it("is on where there is a mouse", () => {
    expect(isVoiceSupported(false)).toBe(true);
  });
});
