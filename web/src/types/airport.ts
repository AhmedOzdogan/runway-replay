export interface Airport {
  name: string;
  /** [lon, lat] */
  center: [number, number];
  /** Field elevation in feet above sea level (ADS-B altitudes are above sea level too). */
  elevationFt: number;
}
