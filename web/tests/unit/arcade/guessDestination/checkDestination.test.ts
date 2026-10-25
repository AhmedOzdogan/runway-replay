import { describe, expect, it } from "vitest";
import { checkDestination } from "../../../../src/arcade/guessDestination/checkDestination";
import { flightList } from "../../helpers";

// flightList leaves every third flight without a destination, so pick ones deliberately here.
const [withoutDestination, , toDublin] = flightList(3);

describe("checkDestination", () => {
  it("accepts the airport the flight actually went to", () => {
    expect(toDublin.destination?.icao).toBe("EIDW"); // the fixture, pinned
    expect(checkDestination(toDublin, "EIDW")).toBe(true);
  });

  it("rejects any other airport", () => {
    expect(checkDestination(toDublin, "EDDH")).toBe(false);
    expect(checkDestination(toDublin, "")).toBe(false);
  });

  it("rejects everything when the flight's destination is unknown", () => {
    // 15% of departures never resolve, so a round must never be built from one.
    expect(withoutDestination.destination).toBeNull();
    expect(checkDestination(withoutDestination, "EIDW")).toBe(false);
    expect(checkDestination(withoutDestination, "")).toBe(false);
  });

  it("matches the code exactly, ignoring case", () => {
    expect(checkDestination(toDublin, "eidw")).toBe(true);
    expect(checkDestination(toDublin, " EIDW ")).toBe(true);
  });
});
