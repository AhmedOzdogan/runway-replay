/** Equirectangular distance in km; accurate enough over an airport zone. */
export function distanceKm(a: [number, number], b: [number, number]): number {
  const dx = (b[0] - a[0]) * 111.32 * Math.cos((a[1] * Math.PI) / 180);
  const dy = (b[1] - a[1]) * 110.57;
  return Math.hypot(dx, dy);
}
