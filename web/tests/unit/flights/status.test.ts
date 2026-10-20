import { describe, expect, it } from "vitest";
import { planeAt } from "../../../src/flights/planes";
import { describeStatus } from "../../../src/flights/status";
import { flightThrough } from "../helpers";

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
