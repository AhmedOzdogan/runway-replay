import { describe, expect, it } from "vitest";
import {
  isRadioTalking,
  linesPlayedThrough,
  linesSoFar,
  radioScript,
} from "../../../src/flights/radioScript";
import { AIRPORT, flightThrough } from "../helpers";

// Descends from 6000 ft, touches down at 660 s, rolls out until 700 s.
const arrival = flightThrough([
  [0, 11.6, 6000],
  [300, 11.7, 3000],
  [600, 11.77, 1600],
  [660, 11.78, 0],
  [700, 11.785, 0],
]);
const TOUCHDOWN = 660;
const SEED = 42;

describe("radioScript for an arrival", () => {
  const lines = radioScript(arrival, AIRPORT, SEED);

  it("has lines, sorted by time", () => {
    expect(lines.length).toBeGreaterThan(0);
    const times = lines.map((line) => line.time);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("clears the plane to land before touchdown", () => {
    const cleared = lines.find((line) => line.text.includes("cleared to land"));
    expect(cleared?.time).toBeLessThan(TOUCHDOWN);
  });

  it("talks about vacating the runway after touchdown", () => {
    const vacate = lines.find((line) =>
      line.text.toLowerCase().includes("vacate"),
    );
    expect(vacate?.time).toBeGreaterThan(TOUCHDOWN);
  });

  it("fills every placeholder, written and spoken", () => {
    for (const line of lines) {
      expect(line.text).not.toContain("{");
      expect(line.spoken).not.toContain("{");
    }
  });

  it("writes the callsign as letters and says it with the radio alphabet", () => {
    for (const line of lines) {
      expect(line.text).toContain("TST1");
      expect(line.spoken.toLowerCase()).toContain("tango sierra tango one");
    }
  });

  it("is the same every time for the same seed", () => {
    expect(radioScript(arrival, AIRPORT, SEED)).toEqual(lines);
  });

  it("varies between seeds", () => {
    const scripts = new Set(
      Array.from({ length: 20 }, (_, seed) =>
        JSON.stringify(radioScript(arrival, AIRPORT, seed)),
      ),
    );
    expect(scripts.size).toBeGreaterThan(1);
  });
});

// On the ground (taxiing) until 150 s, lifts off at 210 s, climbs away.
const departure = flightThrough([
  [0, 11.76, 0],
  [150, 11.77, 0],
  [210, 11.8, 800],
  [330, 11.9, 4000],
]);
const LIFTOFF = 210;

describe("radioScript for a departure", () => {
  const lines = radioScript(departure, AIRPORT, SEED);

  it("talks about taxiing before the take-off clearance", () => {
    const takeoff = lines.findIndex((line) =>
      line.text.includes("cleared for take-off"),
    );
    const beforeTakeoff = lines.slice(0, takeoff);
    expect(beforeTakeoff.some((line) => /taxi/i.test(line.text))).toBe(true);
  });

  it("clears the plane for take-off before lift-off", () => {
    const cleared = lines.find((line) =>
      line.text.includes("cleared for take-off"),
    );
    expect(cleared?.time).toBeLessThan(LIFTOFF);
  });

  it("talks to the plane again after lift-off", () => {
    expect(lines.at(-1)?.time).toBeGreaterThan(LIFTOFF);
  });

  it("has lines sorted by time, all filled in", () => {
    const times = lines.map((line) => line.time);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    for (const line of lines) expect(line.text).not.toContain("{");
  });

  it("skips the taxi call when the plane is first seen on the take-off roll", () => {
    const seenOnTheRoll = flightThrough([
      [0, 11.77, 0],
      [40, 11.79, 0],
      [60, 11.8, 600],
      [180, 11.9, 4000],
    ]);
    const firstLine = radioScript(seenOnTheRoll, AIRPORT, SEED)[0];
    expect(firstLine.text.toLowerCase()).not.toContain("request taxi");
    expect(firstLine.time).toBeGreaterThanOrEqual(0);
  });
});

// Descends, goes around at 300 s (lowest 1650 ft), climbs to ~5000 ft, lands at 1200 s.
const goAround = {
  ...flightThrough([
    [0, 11.6, 6000],
    [300, 11.76, 1650],
    [420, 11.9, 4900],
    [600, 12.0, 5000],
    [1000, 11.7, 3000],
    [1140, 11.77, 1600],
    [1200, 11.78, 0],
    [1240, 11.785, 0],
  ]),
  goAroundAt: 300,
};

describe("radioScript for a go-around", () => {
  const lines = radioScript(goAround, AIRPORT, SEED);
  const goAroundLine = lines.find((line) => /go(ing)? around/i.test(line.text));

  it("has a go-around call at the go-around", () => {
    expect(goAroundLine?.time).toBe(300);
  });

  it("clears the plane to land twice: before the go-around and before the real landing", () => {
    const cleared = lines.filter((line) => /cleared to land/i.test(line.text));
    expect(cleared.some((line) => line.time < 300)).toBe(true);
    expect(cleared.some((line) => line.time > 300 && line.time < 1200)).toBe(
      true,
    );
  });

  it("climbs to where the plane really went, not its lowest point", () => {
    const climb = lines.find((line) => /climb to/i.test(line.text));
    if (climb) {
      expect(climb.text).toContain("5,000 ft");
      expect(climb.spoken).toContain("five thousand feet");
    }
  });

  it("still lands and vacates at the end", () => {
    expect(lines.at(-1)?.time).toBeGreaterThan(1200);
  });

  it("uses a different exchange for the second cleared-to-land", () => {
    // First one starts 90 s before the go-around, second one 90 s before touchdown.
    const exchangeFrom = (start: number) =>
      lines
        .filter((line) => line.time >= start && line.time < start + 30)
        .map((line) => line.text)
        .join(" ");
    expect(exchangeFrom(210)).not.toBe("");
    expect(exchangeFrom(1110)).not.toBe("");
    expect(exchangeFrom(210)).not.toBe(exchangeFrom(1110));
  });
});

describe("radioScript for other flights", () => {
  it("is silent for an overflight, for now", () => {
    const overflight = flightThrough([
      [0, 11.6, 9000],
      [120, 11.9, 9000],
    ]);
    expect(radioScript(overflight, AIRPORT, SEED)).toEqual([]);
  });
});

describe("linesSoFar and isRadioTalking", () => {
  const lines = [
    { time: 100, speaker: "ATC" as const, text: "first", spoken: "first" },
    {
      time: 106,
      speaker: "PILOT" as const,
      text: "readback",
      spoken: "readback",
    },
    { time: 500, speaker: "ATC" as const, text: "later", spoken: "later" },
  ];

  it("shows only the lines said up to now", () => {
    expect(linesSoFar(lines, 99)).toEqual([]);
    expect(linesSoFar(lines, 106).map((line) => line.text)).toEqual([
      "first",
      "readback",
    ]);
  });

  it("is talking during an exchange and quiet between exchanges", () => {
    expect(isRadioTalking(lines, 99)).toBe(false);
    expect(isRadioTalking(lines, 100)).toBe(true);
    expect(isRadioTalking(lines, 110)).toBe(true);
    expect(isRadioTalking(lines, 200)).toBe(false);
    expect(isRadioTalking(lines, 503)).toBe(true);
  });
});

describe("linesPlayedThrough", () => {
  const lines = [
    { time: 100, speaker: "ATC" as const, text: "first", spoken: "first" },
    {
      time: 106,
      speaker: "PILOT" as const,
      text: "readback",
      spoken: "readback",
    },
  ];

  it("returns the lines crossed while playing forward", () => {
    expect(linesPlayedThrough(lines, 99, 101).map((l) => l.text)).toEqual([
      "first",
    ]);
    expect(linesPlayedThrough(lines, 101, 106).map((l) => l.text)).toEqual([
      "readback",
    ]);
  });

  it("doesn't repeat a line that was already crossed", () => {
    expect(linesPlayedThrough(lines, 100, 103)).toEqual([]);
  });

  it("returns nothing when going backwards or jumping with the slider", () => {
    expect(linesPlayedThrough(lines, 110, 99)).toEqual([]);
    expect(linesPlayedThrough(lines, 0, 5000)).toEqual([]);
  });
});

describe("every radio variant", () => {
  // 200 seeds reach every variant of every phase, not just the one seed 42 picks.
  it("is filled in and names the callsign, for arrivals, departures and go-arounds", () => {
    for (const flight of [arrival, departure, goAround]) {
      for (let seed = 0; seed < 200; seed++) {
        for (const line of radioScript(flight, AIRPORT, seed)) {
          expect(line.text).not.toContain("{");
          expect(line.spoken).not.toContain("{");
          expect(line.text).toContain("TST1");
          expect(line.spoken.toLowerCase()).toContain("tango sierra tango one");
        }
      }
    }
  });
});
