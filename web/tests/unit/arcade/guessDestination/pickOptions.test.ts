import { describe, expect, it } from "vitest";
import { pickOptions } from "../../../../src/arcade/guessDestination/pickOptions";
import type { RouteEnd } from "../../../../src/types/flight";
import { DESTINATIONS } from "../../helpers";

const HAMBURG = DESTINATIONS[0];

describe("pickOptions", () => {
  it("offers four places", () => {
    expect(pickOptions(HAMBURG, DESTINATIONS)).toHaveLength(4);
  });

  it("always includes where the flight really went", () => {
    for (const answer of DESTINATIONS) {
      expect(pickOptions(answer, DESTINATIONS)).toContainEqual(answer);
    }
  });

  it("never repeats a city", () => {
    const options = pickOptions(HAMBURG, DESTINATIONS);
    expect(new Set(options.map((option) => option.city)).size).toBe(
      options.length,
    );
  });

  it("never offers two airports of the same city", () => {
    // Both are London: offering both would leave the round without a single right answer.
    const london = [
      { icao: "EGLL", city: "London" },
      { icao: "EGKK", city: "London" },
      ...DESTINATIONS,
    ];
    const options = pickOptions(london[0], london);
    expect(options.filter((option) => option.city === "London")).toHaveLength(
      1,
    );
  });

  it("gives the same options for the same seed", () => {
    const cities = (seed: number) =>
      pickOptions(HAMBURG, DESTINATIONS, 4, seed).map((option) => option.city);
    expect(cities(1234)).toEqual(cities(1234));
    expect(cities(1234)).not.toEqual(cities(4321));
  });

  it("doesn't always put the answer in the same place", () => {
    const slotOf = (answer: RouteEnd) =>
      pickOptions(answer, DESTINATIONS).findIndex(
        (option) => option.icao === answer.icao,
      );
    expect(new Set(DESTINATIONS.map(slotOf)).size).toBeGreaterThan(1);
  });

  it("returns what it can when the day went to few places", () => {
    const two = DESTINATIONS.slice(0, 2);
    expect(pickOptions(two[0], two)).toHaveLength(2);
    expect(pickOptions(two[0], [two[0]])).toHaveLength(1);
  });
});
