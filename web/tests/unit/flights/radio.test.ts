import { describe, expect, it } from "vitest";
import {
  fillTemplate,
  spellOut,
  spokenAltitude,
  spokenCallsign,
  spokenHeading,
  spokenRunway,
  stableIndex,
  writtenAltitude,
  writtenCallsign,
  writtenHeading,
  writtenRunway,
} from "../../../src/flights/radio";

describe("spokenCallsign", () => {
  it("spells letters with the radio alphabet and digits as words", () => {
    expect(spokenCallsign("ABC1")).toBe("alfa bravo charlie one");
    expect(spokenCallsign("BAV1")).toBe("Bamboo one");
  });

  it("says the airline's radio name, then spells the rest", () => {
    expect(spokenCallsign("DLH4AB")).toBe("Lufthansa four alfa bravo");
  });

  it("uses the radio name even when it differs from the airline, and says 9 as niner", () => {
    expect(spokenCallsign("BAW92")).toBe("Speedbird niner two");
  });

  it("spells everything when the airline is unknown", () => {
    expect(spokenCallsign("ELEKT04")).toBe(
      "echo lima echo kilo tango zero four",
    );
  });

  it("skips characters that aren't letters or digits", () => {
    expect(spokenCallsign("D-AIBD")).toBe("delta alfa india bravo delta");
  });

  it("works with lowercase input", () => {
    expect(spokenCallsign("dlh4ab")).toBe("Lufthansa four alfa bravo");
  });

  it("has no trailing space when there's nothing after the airline", () => {
    expect(spokenCallsign("DLH")).toBe("Lufthansa");
  });
});

describe("spellOut", () => {
  it("spells letters and digits, skipping everything else", () => {
    expect(spellOut("4A-B 9")).toBe("four alfa bravo niner");
  });
});

describe("spokenRunway", () => {
  it("spells the runway after its direction", () => {
    expect(spokenRunway(290)).toBe("two niner");
    expect(spokenRunway(123)).toBe("one two");
    expect(spokenRunway(360)).toBe("three six");
    expect(spokenRunway(80)).toBe("zero eight");
  });

  it("calls north runway three six, never zero zero", () => {
    expect(spokenRunway(4)).toBe("three six");
  });

  it("rounds the heading to the nearest runway", () => {
    expect(spokenRunway(135)).toBe("one four");
    expect(spokenRunway(357)).toBe("three six");
  });
});

describe("spokenAltitude", () => {
  it("spells the altitude", () => {
    expect(spokenAltitude(1000)).toBe("one thousand feet");
    expect(spokenAltitude(5000)).toBe("five thousand feet");
    expect(spokenAltitude(9500)).toBe("niner thousand five hundred feet");
    expect(spokenAltitude(10000)).toBe("flight level one zero zero");
    expect(spokenAltitude(12000)).toBe("flight level one two zero");
    expect(spokenAltitude(31000)).toBe("flight level three one zero");
  });

  it("rounds real, uneven altitudes to the nearest hundred feet", () => {
    expect(spokenAltitude(2633)).toBe("two thousand six hundred feet");
    expect(spokenAltitude(2050)).toBe("two thousand one hundred feet");
  });

  it("leaves out the thousands below 1000 ft", () => {
    expect(spokenAltitude(800)).toBe("eight hundred feet");
  });

  it("decides on the rounded value, so rounding never says zero hundred", () => {
    expect(spokenAltitude(2030)).toBe("two thousand feet");
    expect(spokenAltitude(2970)).toBe("three thousand feet");
    expect(spokenAltitude(950)).toBe("one thousand feet");
  });

  it("switches to a flight level when the rounded value reaches the transition altitude", () => {
    expect(spokenAltitude(9960)).toBe("flight level one zero zero");
  });

  it("says ground level for altitudes that round to zero", () => {
    expect(spokenAltitude(40)).toBe("ground level");
  });

  it("rounds flight levels to the nearest hundred feet", () => {
    expect(spokenAltitude(14750)).toBe("flight level one four eight");
  });
});

describe("spokenHeading", () => {
  it("spells the heading", () => {
    expect(spokenHeading(82)).toBe("zero eight two");
    expect(spokenHeading(123)).toBe("one two three");
    expect(spokenHeading(200)).toBe("two zero zero");
    expect(spokenHeading(300)).toBe("three zero zero");
    expect(spokenHeading(360)).toBe("three six zero");
  });

  it("rounds headings with decimals", () => {
    expect(spokenHeading(81.7)).toBe("zero eight two");
  });

  it("turns negative headings into 0–360", () => {
    expect(spokenHeading(-98)).toBe("two six two");
  });

  it("rounds before deciding on north", () => {
    expect(spokenHeading(0.3)).toBe("three six zero");
  });

  it("calls north three six zero, never zero zero zero", () => {
    expect(spokenHeading(0)).toBe("three six zero");
  });
});

describe("fillTemplate", () => {
  it("fills every placeholder", () => {
    expect(fillTemplate("{a} and {b}", { a: "1", b: "2" })).toBe("1 and 2");
  });

  it("ignores values the template doesn't use", () => {
    expect(fillTemplate("{a}", { a: "1", b: "2" })).toBe("1");
  });

  it("fills the same placeholder twice", () => {
    expect(fillTemplate("{a}-{a}", { a: "x" })).toBe("x-x");
  });

  it("leaves no 'undefined' for unknown placeholders", () => {
    expect(fillTemplate("Hi {missing}", {})).toBe("Hi ");
  });
});

describe("stableIndex", () => {
  it("gives the same index for the same seed", () => {
    expect(stableIndex("abc123-approach", 5)).toBe(
      stableIndex("abc123-approach", 5),
    );
  });

  it("always stays within 0 … count - 1", () => {
    for (const seed of [
      "a",
      "abc123-approach",
      "4ca7b5-takeoff",
      "x".repeat(50),
    ]) {
      const index = stableIndex(seed, 4);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(4);
    }
  });

  // The whole point: different flights should get different variants.
  // A lazy `return 0` passes the two tests above but fails these.
  it("spreads different flights over every variant", () => {
    const indexes = new Set<number>();
    for (let flight = 0; flight < 200; flight++) {
      indexes.add(stableIndex(`flight${flight}-approach`, 5));
    }
    expect(indexes.size).toBe(5);
  });

  it("can give different variants for different phases of the same flight", () => {
    const phases = [
      "approach",
      "clearedToLand",
      "afterLanding",
      "taxiOut",
      "takeoff",
      "goAround",
    ];
    const indexes = new Set(
      phases.map((phase) => stableIndex(`abc123-${phase}`, 4)),
    );
    expect(indexes.size).toBeGreaterThan(1);
  });
});

describe("written forms (for the transcript)", () => {
  it("writes the callsign in capitals, without padding", () => {
    expect(writtenCallsign(" thy7jk ")).toBe("THY7JK");
  });

  it("writes runways with two digits, never 00", () => {
    expect(writtenRunway(80)).toBe("08");
    expect(writtenRunway(262)).toBe("26");
    expect(writtenRunway(4)).toBe("36");
  });

  it("writes altitudes in feet below 10,000 ft and as flight levels above", () => {
    expect(writtenAltitude(2633)).toBe("2,600 ft");
    expect(writtenAltitude(800)).toBe("800 ft");
    expect(writtenAltitude(9960)).toBe("FL100");
    expect(writtenAltitude(14750)).toBe("FL148");
    expect(writtenAltitude(40)).toBe("ground level");
  });

  it("writes headings with three digits, north as 360", () => {
    expect(writtenHeading(81.7)).toBe("082");
    expect(writtenHeading(-98)).toBe("262");
    expect(writtenHeading(0)).toBe("360");
  });
});
