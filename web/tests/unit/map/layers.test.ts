import { describe, expect, it } from "vitest";
import { iconAngle } from "../../../src/map/layers";

describe("iconAngle", () => {
  it("turns a clockwise heading into a counter-clockwise icon angle", () => {
    expect(iconAngle(90, 0)).toBe(-90);
    expect(iconAngle(0, 0)).toBe(0);
  });

  it("follows the map when it is rotated", () => {
    // Map rotated so that east is up: a plane heading east points straight up.
    expect(iconAngle(90, 90)).toBe(0);
    // Same rotation, plane heading south: a quarter turn clockwise on screen.
    expect(iconAngle(180, 90)).toBe(-90);
  });
});
