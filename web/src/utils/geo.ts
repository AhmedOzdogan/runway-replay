/** Kilometres per degree of latitude (roughly constant). */
export const KM_PER_DEGREE_LAT = 110.57;
/** Kilometres per degree of longitude at the equator; multiply by cos(latitude) elsewhere. */
export const KM_PER_DEGREE_LON_AT_EQUATOR = 111.32;

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Distance in km between two [longitude, latitude] positions; accurate enough over an airport zone. */
export function distanceKm(
  from: [number, number],
  to: [number, number],
): number {
  const eastKm =
    (to[0] - from[0]) *
    KM_PER_DEGREE_LON_AT_EQUATOR *
    Math.cos(degreesToRadians(from[1]));
  const northKm = (to[1] - from[1]) * KM_PER_DEGREE_LAT;
  return Math.hypot(eastKm, northKm);
}
