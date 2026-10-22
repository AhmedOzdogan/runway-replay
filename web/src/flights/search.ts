import { type Flight, TIME } from "../types/flight";
import { isGroundVehicle } from "./vehicle";

const normalize = (text: string) => text.toUpperCase().replace(/\s/g, "");

export function searchFlights(
  flights: Flight[],
  query: string,
  limit = 8,
): Flight[] {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) return [];

  const returnList: Flight[] = flights.filter(
    (flight) =>
      !isGroundVehicle(flight) &&
      [flight.callsign, flight.registration, flight.icao].some(
        (field) => field && normalize(field).includes(normalizedQuery),
      ),
  );

  if (returnList.length === 0) return [];

  const sortedReturn = [...returnList].sort(
    (a, b) => a.points[0][TIME] - b.points[0][TIME],
  );

  return sortedReturn.slice(0, limit);
}
