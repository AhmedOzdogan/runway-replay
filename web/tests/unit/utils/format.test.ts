import { describe, expect, it } from "vitest";
import { formatFlightTime } from "../../../src/utils/format";

describe("formatFlightTime", () => {
  it("says hours and minutes for a long flight", () => {
    expect(formatFlightTime(5 * 3600 + 10 * 60)).toBe("~ 5 h 10 m");
  });

  it("drops the minutes when there are none", () => {
    expect(formatFlightTime(2 * 3600)).toBe("~ 2 h");
  });

  it("stays in minutes under an hour", () => {
    expect(formatFlightTime(55 * 60)).toBe("~ 55 min");
  });
});
