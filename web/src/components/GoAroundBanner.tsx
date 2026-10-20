import type { Flight } from "../types/flight";

interface GoAroundBannerProps {
  flight: Flight;
  airportCode: string;
  onClick: () => void;
}

/** Big amber "GO AROUND!" announcement; render it with a `key` so it pops in again for each new one. */
export function GoAroundBanner({
  flight,
  airportCode,
  onClick,
}: GoAroundBannerProps) {
  const callsign = flight.callsign ?? flight.icao.toUpperCase();
  return (
    <button
      type="button"
      aria-live="assertive"
      onClick={onClick}
      className="absolute top-4 left-1/2 z-20 -translate-x-1/2 cursor-pointer rounded-full border-2 border-amber bg-[#1a1408ee] px-5.5 py-2.5 text-lg font-extrabold tracking-widest text-amber shadow-amber motion-safe:animate-pop"
    >
      GO AROUND! · {callsign} at {airportCode}
    </button>
  );
}
