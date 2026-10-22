import { describe, expect, it } from "vitest";
import { searchFlights } from "../../../src/flights/search";
import { flightThrough } from "../helpers";

const lufthansa = {
  ...flightThrough([[36000, 11.7, 3000]]), // first seen at 10:00
  callsign: "DLH2XN",
  registration: "D-AINU",
  icao: "3c6444",
};
// A second Lufthansa, earlier in the day: the two also test the order of the results.
const earlierLufthansa = {
  ...flightThrough([[28800, 11.7, 3000]]), // first seen at 08:00
  callsign: "DLH9QT",
  registration: "D-AIBD",
  icao: "3c4b22",
};

const groundVehicle = {
  ...flightThrough([[36000, 11.7, 0]]), // stays at altitude 0
  callsign: "OPS12",
  category: "C2", // ADS-B "surface vehicle"
};

// Ground vehicles come without a callsign.
const vehicle = { ...flightThrough([[36000, 11.7, 0]]), callsign: null };

describe("searchFlights", () => {
  it("ignores case and spaces in the query", () => {
    expect(searchFlights([lufthansa], "dlh 2xn")).toEqual([lufthansa]);
  });
  it("finds the flight from partial query", () => {
    expect(searchFlights([lufthansa], "DLH")).toEqual([lufthansa]);
  });
  it("also matches the registration and the ICAO address", () => {
    expect(searchFlights([lufthansa], "d-ainu")).toEqual([lufthansa]);
    expect(searchFlights([lufthansa], "3C6444")).toEqual([lufthansa]);
  });
  it("for empty string, return empty list", () => {
    expect(searchFlights([lufthansa], "")).toEqual([]);
  });
  it("for space, return empty list", () => {
    expect(searchFlights([lufthansa], " ")).toEqual([]);
  });
  it("returns an empty list when nothing matches", () => {
    expect(searchFlights([lufthansa], "AFR")).toEqual([]);
  });
  it("dont match a flight without a callsign", () => {
    expect(searchFlights([vehicle], "TST")).toEqual([]);
  });
  it("returns the flight seen first at the top", () => {
    expect(searchFlights([lufthansa, earlierLufthansa], "DLH")).toEqual([
      earlierLufthansa,
      lufthansa,
    ]);
  });
  it("returns at most `limit` flights", () => {
    expect(searchFlights([lufthansa, earlierLufthansa], "DLH", 1)).toEqual([
      earlierLufthansa,
    ]);
  });
  it("never returns ground vehicles", () => {
    expect(searchFlights([groundVehicle], "OPS")).toEqual([]);
  });
});
