import { describe, expect, it } from "vitest";
import { destinationsOf } from "../../../../src/arcade/guessDestination/destinationsOf";
import { DESTINATIONS, flightList, flightThrough } from "../../helpers";

describe("destinationsOf", () => {
  it("lists where the day's flights went", () => {
    // flightList cycles through DESTINATIONS, and 60 flights is long enough to reach all 20.
    expect(destinationsOf(flightList(60))).toEqual(
      expect.arrayContaining(DESTINATIONS),
    );
  });

  it("lists a place once however many flights went there", () => {
    const toHamburg = {
      ...flightThrough([[0, 11.7, 3000]]),
      destination: DESTINATIONS[0],
    };
    const alsoToHamburg = { ...toHamburg, icao: "other1" };
    expect(destinationsOf([toHamburg, alsoToHamburg])).toEqual([
      DESTINATIONS[0],
    ]);
  });

  it("keeps one airport per city", () => {
    // Heathrow and Gatwick are both London; a round can only offer one of them.
    const toHeathrow = {
      ...flightThrough([[0, 11.7, 3000]]),
      destination: { icao: "EGLL", city: "London" },
    };
    const toGatwick = {
      ...toHeathrow,
      icao: "other1",
      destination: { icao: "EGKK", city: "London" },
    };
    expect(destinationsOf([toHeathrow, toGatwick])).toHaveLength(1);
  });

  it("skips flights whose destination is unknown", () => {
    const unknown = flightThrough([[0, 11.7, 3000]]); // destination: null
    expect(destinationsOf([unknown])).toEqual([]);
  });

  it("skips ground vehicles", () => {
    const mower = {
      ...flightThrough([
        [0, 11.78, 0],
        [60, 11.79, 0],
      ]),
      category: "C2",
      type: null,
      destination: DESTINATIONS[0],
    };
    expect(destinationsOf([mower])).toEqual([]);
  });

  it("has nothing to list for an empty day", () => {
    expect(destinationsOf([])).toEqual([]);
  });
});
