import { useMemo, useState } from "react";
import { AIRLINES } from "../data/names";
import { searchFlights } from "../flights/search";
import { type Flight, TIME } from "../types/flight";
import { formatClockTime } from "../utils/format";

interface FlightSearchProps {
  flights: Flight[];
  onPick: (flight: Flight) => void;
}

/** Search the day's flights by callsign (also registration and ICAO address) and jump to one. */
export function FlightSearch({ flights, onPick }: FlightSearchProps) {
  const [query, setQuery] = useState("");
  const results = useMemo(
    () => searchFlights(flights, query),
    [flights, query],
  );

  // Clearing the query also closes the result list.
  function pick(flight: Flight) {
    setQuery("");
    onPick(flight);
  }

  return (
    <div className="relative w-full sm:w-52">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setQuery("");
          if (event.key === "Enter" && results[0]) pick(results[0]);
        }}
        placeholder="Callsign, e.g. DLH2XN"
        aria-label="Search flights by callsign"
        className="w-full rounded-full border border-line bg-night/60 px-3.5 py-1 placeholder:text-muted focus:border-neon focus:outline-none"
      />
      {results.length > 0 && (
        // deck.gl draws in MapLibre's control corner (z-index 2); stay above it.
        <ul className="absolute top-full right-0 left-0 z-20 mt-1 overflow-hidden rounded-2xl border border-line bg-panel shadow-card">
          {results.map((flight) => {
            const callsign = flight.callsign ?? flight.icao;
            return (
              // One aircraft can visit twice a day, so the time belongs in the key.
              <li key={`${flight.icao}-${flight.points[0][TIME]}`}>
                <button
                  type="button"
                  onClick={() => pick(flight)}
                  className="flex w-full cursor-pointer items-center gap-2 px-3.5 py-1.5 text-left hover:bg-white/5"
                >
                  <span className="font-semibold text-neon">{callsign}</span>
                  <span className="flex-1 truncate text-[13px] text-muted">
                    {AIRLINES[callsign.slice(0, 3)] ?? ""}
                  </span>
                  <span className="text-[13px] text-muted">
                    {formatClockTime(flight.points[0][TIME])}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
