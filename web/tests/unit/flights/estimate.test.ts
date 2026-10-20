import { describe, expect, it } from "vitest";
import { fillMissingEnds } from "../../../src/flights/estimate";
import { classifyFlight } from "../../../src/flights/status";
import { AIRPORT, flightThrough } from "../helpers";

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
