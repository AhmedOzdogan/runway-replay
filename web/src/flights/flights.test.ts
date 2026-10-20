import { describe, expect, it } from "vitest";
import type { Airport } from "../types/airport";
import type { Flight, Point } from "../types/flight";
import { fillMissingEnds } from "./estimate";
import { findGoAround } from "./goAround";
import { findParkings, planeAt } from "./planes";
import {
  runwayFromHeading,
  spellOut,
  spokenAltitude,
  spokenCallsign,
  spokenHeading,
} from "./radio";
import { classifyFlight, describeStatus } from "./status";
import { isGroundVehicle } from "./vehicle";

const AIRPORT: Airport = {
  name: "Test",
  center: [11.78, 48.35],
  elevationFt: 1500,
};

/** A flight flying due east along latitude 48.35, one point per (time, lon, altitude). */
function flightThrough(
  points: [time: number, lon: number, altitude: number][],
): Flight {
  return {
    icao: "abc123",
    registration: "D-TEST",
    type: "A320",
    callsign: "TST1",
    category: "A3",
    points: points.map(
      ([time, lon, altitude]): Point => [time, lon, 48.35, altitude],
    ),
  };
}

describe("planeAt", () => {
  it("is halfway between two points at half time, heading east", () => {
    const plane = planeAt(
      flightThrough([
        [0, 11.7, 4000],
        [60, 11.8, 2000],
      ]),
      30,
    );
    expect(plane?.position[0]).toBeCloseTo(11.75);
    expect(plane?.altitude).toBe(3000);
    expect(plane?.heading).toBeCloseTo(90);
    expect(plane?.verticalRate).toBeCloseTo(-2000);
  });

  it("is null outside the flight's time range", () => {
    expect(
      planeAt(
        flightThrough([
          [0, 11.7, 4000],
          [60, 11.8, 2000],
        ]),
        61,
      ),
    ).toBeNull();
  });
});

describe("findGoAround", () => {
  it("finds an approach that gets low and climbs away without landing", () => {
    const goAround = flightThrough([
      [0, 11.6, 6000],
      [60, 11.7, 3000],
      [120, 11.76, 2100], // 600 ft above the field, near the airport
      [180, 11.8, 4000], // climbs away
    ]);
    expect(findGoAround(goAround, AIRPORT)).toBe(120);
  });

  it("ignores a normal landing and a departure", () => {
    const landing = flightThrough([
      [0, 11.6, 6000],
      [120, 11.76, 2000],
      [180, 11.78, 0],
    ]);
    const departure = flightThrough([
      [0, 11.78, 0],
      [60, 11.8, 2000],
      [120, 11.9, 5000],
    ]);
    expect(findGoAround(landing, AIRPORT)).toBeUndefined();
    expect(findGoAround(departure, AIRPORT)).toBeUndefined();
  });
});

describe("fillMissingEnds", () => {
  it("lands an arrival whose data stops just above the runway", () => {
    const arrival = flightThrough([
      [0, 11.74, 2300],
      [10, 11.75, 2200], // last point: ~700 ft above the field, ~2 km out
    ]);
    const [filled] = fillMissingEnds([arrival], AIRPORT);
    expect(filled.estimatedAfter).toBe(10);
    expect(filled.points.at(-1)?.[3]).toBe(0);
    expect(classifyFlight(filled).kind).toBe("arrival");
  });
});

describe("describeStatus", () => {
  it("doesn't count down to a landing that comes after an unflown go-around", () => {
    const flight = {
      ...flightThrough([
        [0, 11.6, 6000],
        [600, 11.78, 0],
      ]),
      goAroundAt: 300,
    };
    const plane = planeAt(flight, 100);
    expect(plane && describeStatus(plane, 100)).toBe("On approach");
    const afterGoAround = planeAt(flight, 310);
    expect(afterGoAround && describeStatus(afterGoAround, 310)).toBe(
      "GO AROUND!",
    );
  });
});

describe("findParkings", () => {
  // Both flights land; only how fast they're moving at their last point differs.
  // At latitude 48.35, 0.0001° of longitude is about 7 m and 0.0042° about 310 m.

  it("parks a plane whose data ends at taxi speed", () => {
    const reachesGate = flightThrough([
      [0, 11.7, 2000],
      [60, 11.78, 0],
      [70, 11.7801, 0], // ~7 m in 10 s ≈ 1 kt
    ]);
    expect(findParkings([reachesGate])).toHaveLength(1);
  });

  it("doesn't park a plane whose data ends at runway speed", () => {
    const lostOnRunway = flightThrough([
      [0, 11.7, 2000],
      [60, 11.77, 0],
      [70, 11.7742, 0], // ~310 m in 10 s ≈ 60 kt: the receiver lost it mid-rollout
    ]);
    expect(findParkings([lostOnRunway])).toHaveLength(0);
  });
});

describe("isGroundVehicle", () => {
  const drivesAround = flightThrough([
    [0, 11.77, 0],
    [60, 11.78, 0],
  ]);

  it("is true for a vehicle that sends category C2", () => {
    expect(isGroundVehicle({ ...drivesAround, category: "C2" })).toBe(true);
  });

  it("is true for a track with no category and no type that never leaves the ground", () => {
    expect(
      isGroundVehicle({ ...drivesAround, category: null, type: null }),
    ).toBe(true);
  });

  it("is false for an airliner, even when its callsign starts with C", () => {
    const condor = {
      ...drivesAround,
      callsign: "CFG123",
      category: "A3",
      type: "A320",
    };
    expect(isGroundVehicle(condor)).toBe(false);
  });
});

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

describe("runwayFromHeading", () => {
  it("spells the runway after its direction", () => {
    expect(runwayFromHeading(290)).toBe("two niner");
    expect(runwayFromHeading(123)).toBe("one two");
    expect(runwayFromHeading(360)).toBe("three six");
    expect(runwayFromHeading(80)).toBe("zero eight");
  });

  it("calls north runway three six, never zero zero", () => {
    expect(runwayFromHeading(4)).toBe("three six");
  });

  it("rounds the heading to the nearest runway", () => {
    expect(runwayFromHeading(135)).toBe("one four");
    expect(runwayFromHeading(357)).toBe("three six");
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
