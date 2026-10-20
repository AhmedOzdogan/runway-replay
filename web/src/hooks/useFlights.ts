import { useEffect, useState } from "react";
import { AIRPORTS } from "../data/airports";
import { loadFlights } from "../data/load";
import { prepareFlights } from "../flights/prepare";
import type { Flight } from "../types/flight";

interface FlightsState {
  flights: Flight[];
  /** Short text for the header, e.g. "1151 flights · 2026-10-18". */
  status: string;
}

/** Loads and prepares one airport-day; reloads when the airport or date changes. */
export function useFlights(airportCode: string, date: string): FlightsState {
  const [state, setState] = useState<FlightsState>({
    flights: [],
    status: "Loading…",
  });

  useEffect(() => {
    let isCancelled = false; // the user picked another airport before this one finished loading
    setState({ flights: [], status: "Loading…" });

    loadFlights(airportCode, date)
      .then(({ flights, isSample }) => {
        if (isCancelled) return;
        const status = isSample
          ? `No data for ${airportCode} on ${date} yet${flights.length ? ", showing sample flights" : ""}`
          : `${flights.length} flights · ${date}`;
        setState({
          flights: prepareFlights(flights, AIRPORTS[airportCode]),
          status,
        });
      })
      .catch((error: unknown) => {
        if (!isCancelled)
          setState({
            flights: [],
            status: `Could not load ${airportCode}: ${error}`,
          });
      });

    return () => {
      isCancelled = true;
    };
  }, [airportCode, date]);

  return state;
}
