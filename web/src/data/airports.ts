import type { Airport } from "../types/airport";

/**
 * Chosen for ADS-B coverage, which varies hugely by region: these three have enough ground
 * receivers to show taxiing and parked aircraft, and enough coverage around them to tell where a
 * departure went. Keep in sync with pipeline/airports.py; see docs/data-format.md.
 */
export const AIRPORTS: Record<string, Airport> = {
  MUC: { name: "Munich", center: [11.7861, 48.3538], elevationFt: 1487 },
  LHR: { name: "London", center: [-0.4543, 51.47], elevationFt: 83 },
  AMS: { name: "Amsterdam", center: [4.7639, 52.3086], elevationFt: -11 },
};
