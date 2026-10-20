import { ALTITUDE, type Flight } from "../types/flight";

/**
 * True for airport ground vehicles (tractors, mowers, fire trucks…) rather than aircraft.
 * They either send ADS-B emitter category C1/C2 ("surface vehicle"), or send no category at all
 * but never leave the ground and have no aircraft type.
 */
export function isGroundVehicle(flight: Flight): boolean {
  const sendsVehicleCategory = flight.category?.startsWith("C") ?? false;
  const neverFliesAndHasNoType =
    flight.type === null &&
    flight.points.every((point) => point[ALTITUDE] === 0);
  return sendsVehicleCategory || neverFliesAndHasNoType;
}
