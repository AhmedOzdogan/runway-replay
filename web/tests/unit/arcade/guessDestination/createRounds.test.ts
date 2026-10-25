import { describe, expect, it } from "vitest";
import { createRounds } from "../../../../src/arcade/guessDestination/createRounds";
import { flightList } from "../../helpers";

const bigDay = flightList(50);
// 20 flights hold 10 that went somewhere, so a 10-round game is the most it can offer.
const smallDay = flightList(20);

describe("createRounds", () => {
  it("builds five rounds by default", () => {
    expect(createRounds(bigDay)).toHaveLength(5);
  });

  it("builds as many rounds as asked for", () => {
    expect(createRounds(bigDay, 8)).toHaveLength(8);
  });

  it("builds fewer when the day went to few places", () => {
    expect(createRounds(smallDay, 99).length).toBeLessThan(99);
    expect(createRounds([], 5)).toEqual([]);
  });

  it("offers four places in every round", () => {
    for (const round of createRounds(bigDay, 8)) {
      expect(round.options).toHaveLength(4);
    }
  });

  it("offers the real destination in every round", () => {
    for (const round of createRounds(bigDay, 8)) {
      expect(round.options).toContainEqual(round.flight.destination);
    }
  });

  it("never offers the same city twice in a round", () => {
    for (const round of createRounds(bigDay, 8)) {
      const cities = round.options.map((option) => option.city);
      expect(new Set(cities).size).toBe(cities.length);
    }
  });

  it("never asks about the same flight twice", () => {
    const rounds = createRounds(bigDay, 8);
    const keys = rounds.map((round) => round.flight.icao);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("gives the same game for the same seed", () => {
    const game = (seed: number) =>
      createRounds(bigDay, 5, seed).map((round) => ({
        callsign: round.flight.callsign,
        options: round.options.map((option) => option.icao),
      }));
    expect(game(1234)).toEqual(game(1234));
  });

  it("gives a different game for a different seed", () => {
    // Both halves matter: the flights come from pickFlights, the options from pickOptions, and
    // forgetting to pass the seed to either one leaves half the game fixed.
    const flightsOf = (seed: number) =>
      createRounds(bigDay, 5, seed).map((round) => round.flight.callsign);
    const optionsOf = (seed: number) =>
      createRounds(bigDay, 5, seed).flatMap((round) =>
        round.options.map((option) => option.icao),
      );
    expect(flightsOf(1234)).not.toEqual(flightsOf(4321));
    expect(optionsOf(1234)).not.toEqual(optionsOf(4321));
  });
});
