import { describe, expect, it } from "vitest";
import { isGroundVehicle } from "../../../src/flights/vehicle";
import { flightThrough } from "../helpers";

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
