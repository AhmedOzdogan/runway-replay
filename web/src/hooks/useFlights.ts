import { useEffect, useState } from "react";
import { AIRPORTS } from "../data/airports";
import { loadFlights } from "../data/load";
import { prepareFlights } from "../flights/prepare";
import type { Flight } from "../types/flight";

interface FlightsState {
  flights: Flight[];
  /** Short text for the header, e.g. "1151 flights · 2026-10-18". */
  status: string;
  /** True while the day is being fetched, for the loading screen. */
  isLoading: boolean;
}

/** Loads and prepares the newest day for one airport; reloads when the airport changes. */
export function useFlights(airportCode: string): FlightsState {
  const [state, setState] = useState<FlightsState>({
    flights: [],
    status: "Loading…",
    isLoading: true,
  });

  useEffect(() => {
    let isCancelled = false; // the user picked another airport before this one finished loading
    setState({ flights: [], status: "Loading…", isLoading: true });

    loadFlights(airportCode)
      .then(({ flights, date, isSample }) => {
        if (isCancelled) return;
        const status = isSample
          ? `No data for ${airportCode} yet${flights.length ? ", showing sample flights" : ""}`
          : `${flights.length} flights · ${date}`;
        setState({
          flights: prepareFlights(flights, AIRPORTS[airportCode]),
          status,
          isLoading: false,
        });
      })
      .catch((error: unknown) => {
        if (!isCancelled)
          setState({
            flights: [],
            status: `Could not load ${airportCode}: ${error}`,
            isLoading: false,
          });
      });

    return () => {
      isCancelled = true;
    };
  }, [airportCode]);

  return state;
}
