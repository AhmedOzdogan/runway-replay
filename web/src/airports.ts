export interface Airport {
  name: string;
  /** [lon, lat] */
  center: [number, number];
  /** Field elevation in feet above sea level (ADS-B altitudes are above sea level too). */
  elevationFt: number;
}

export const AIRPORTS: Record<string, Airport> = {
  MUC: { name: "Munich", center: [11.7861, 48.3538], elevationFt: 1487 },
  IST: { name: "Istanbul", center: [28.7519, 41.2753], elevationFt: 325 },
  HAN: { name: "Hanoi", center: [105.8072, 21.2212], elevationFt: 39 },
};
