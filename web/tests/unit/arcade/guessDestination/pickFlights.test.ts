import { describe, expect, it } from "vitest";
import {
  pickFlights,
  playable,
} from "../../../../src/arcade/guessDestination/pickFlights";
import { isGroundVehicle } from "../../../../src/flights/vehicle";
import { flightList } from "../../helpers";

describe("pickFlights", () => {
  it("picks five flights by default", () => {
    expect(pickFlights(flightList(45))).toHaveLength(5);
    expect(pickFlights(flightList(20))).toHaveLength(5);
  });

  it("picks as many as asked for", () => {
    expect(pickFlights(flightList(45), 10)).toHaveLength(10);
    expect(pickFlights(flightList(25), 10)).toHaveLength(10);
  });

  it("picks every one it can when the day is too quiet", () => {
    // flightList(15) holds 8 flights with a destination: a shorter game, not an error.
    expect(pickFlights(flightList(15), 10)).toHaveLength(8);
    const flights = flightList(10);
    expect(pickFlights(flights, 99)).toHaveLength(playable(flights).length);
  });

  it("never picks a flight without a destination", () => {
    const picked = pickFlights(flightList(20));
    expect(picked.every((flight) => flight.destination)).toBe(true);
  });

  it("never picks a ground vehicle", () => {
    const picked = pickFlights(flightList(20));
    expect(picked.some((flight) => isGroundVehicle(flight))).toBe(false);
  });

  it("never picks the same flight twice", () => {
    const picked = pickFlights(flightList(45), 10);
    expect(new Set(picked.map((flight) => flight.icao)).size).toBe(
      picked.length,
    );
  });

  it("gives the same game for the same seed", () => {
    const flights = flightList(45);
    const callsigns = (seed: number) =>
      pickFlights(flights, 5, seed).map((flight) => flight.callsign);
    expect(callsigns(1234)).toEqual(callsigns(1234));
    expect(callsigns(1234)).not.toEqual(callsigns(4321));
  });
});
