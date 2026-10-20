export interface Airport {
  name: string;
  /** [lon, lat] */
  center: [number, number];
}

export const AIRPORTS: Record<string, Airport> = {
  MUC: { name: "Munich", center: [11.7861, 48.3538] },
  IST: { name: "Istanbul", center: [28.7519, 41.2753] },
  HAN: { name: "Hanoi", center: [105.8072, 21.2212] },
};
