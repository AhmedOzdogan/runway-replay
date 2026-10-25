import { describe, expect, it } from "vitest";
import { describeCabin } from "../../../src/flights/cabin";
import { flightThrough } from "../helpers";

function flightOf(type: string | null, category: string | null = "A3") {
  return { ...flightThrough([[0, 11.7, 3000]]), type, category };
}

describe("describeCabin", () => {
  it("gives typical seats for an airliner", () => {
    expect(describeCabin(flightOf("A320"))).toBe("~ 180 seats");
  });

  it("names a private jet, with its handful of seats", () => {
    expect(describeCabin(flightOf("PC24"))).toBe("Private jet, ~ 8 seats");
  });

  it("never gives a freighter a seat count", () => {
    expect(describeCabin(flightOf("B77L", "A5"))).toBe("Freighter, no seats");
  });

  it("falls back to the emitter category when the type is unknown", () => {
    expect(describeCabin(flightOf(null, "A7"))).toBe("Helicopter");
    expect(describeCabin(flightOf(null, "A1"))).toBe("Light aircraft");
    expect(describeCabin(flightOf(null, "A5"))).toBe(
      "Heavy, 250 seats or more",
    );
  });

  it("says nothing when the data says nothing", () => {
    expect(describeCabin(flightOf(null, null))).toBeNull();
    expect(describeCabin(flightOf("ZZZZ", "A3"))).toBeNull();
  });
});
