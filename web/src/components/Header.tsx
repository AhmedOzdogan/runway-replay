import { useState } from "react";
import { TbHelpCircle, TbMenu2, TbX } from "react-icons/tb";
import icon1x from "../assets/icon@1x.png";
import icon2x from "../assets/icon@2x.png";
import icon3x from "../assets/icon@3x.png";
import logo1x from "../assets/logo@1x.png";
import logo2x from "../assets/logo@2x.png";
import logo3x from "../assets/logo@3x.png";
import { AIRPORTS } from "../data/airports";
import type { Flight } from "../types/flight";
import { AirportPicker } from "./AirportPicker";
import { FlightSearch } from "./FlightSearch";

const ICON_BUTTON_CLASS =
  "flex size-8 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-white/5 hover:text-neon";

interface HeaderProps {
  airportCode: string;
  status: string;
  onSelectAirport: (code: string) => void;
  onOpenHelp: () => void;
  flights: Flight[];
  onPickFlight: (flight: Flight) => void;
}

export function Header({
  airportCode,
  status,
  onSelectAirport,
  onOpenHelp,
  flights,
  onPickFlight,
}: HeaderProps) {
  // Phones only: the airport picker and the search live behind the hamburger. From 640px (sm) up
  // they sit in the header row and this stays unused.
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="relative flex flex-wrap items-center gap-x-4 border-b border-line bg-panel px-4 py-2.5">
      <h1 className="order-1">
        {/* 28px tall: the icon on phones, the full logo from 640px (Tailwind's sm) up.
            srcSet lets retina screens pick the sharper 2x/3x file. */}
        <picture>
          <source
            media="(min-width: 640px)"
            srcSet={`${logo1x} 1x, ${logo2x} 2x, ${logo3x} 3x`}
          />
          <img
            src={icon1x}
            srcSet={`${icon1x} 1x, ${icon2x} 2x, ${icon3x} 3x`}
            className="h-7 w-auto"
            alt="Runway Replay"
          />
        </picture>
      </h1>

      <span
        role="status"
        className="order-2 ml-auto text-[13px] text-muted sm:order-3"
      >
        {status}
      </span>

      <button
        type="button"
        onClick={onOpenHelp}
        aria-label="About Runway Replay and how to use it"
        title="About & help"
        className={`order-3 sm:order-4 ${ICON_BUTTON_CLASS}`}
      >
        <TbHelpCircle size={22} aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={() => setIsMenuOpen((open) => !open)}
        aria-expanded={isMenuOpen}
        aria-controls="header-menu"
        aria-label={isMenuOpen ? "Close the menu" : "Airports and search"}
        className={`order-4 sm:hidden ${ICON_BUTTON_CLASS}`}
      >
        {isMenuOpen ? (
          <TbX size={22} aria-hidden="true" />
        ) : (
          <TbMenu2 size={22} aria-hidden="true" />
        )}
      </button>

      {/* On phones it drops over the map (z-index 20, above deck.gl's canvas and the flight card)
          so the map never shifts; from sm up it sits in the row between the logo and the status. */}
      <div
        id="header-menu"
        className={`${isMenuOpen ? "flex" : "hidden"} absolute top-full right-0 left-0 z-20 order-5 flex-col gap-3 border-b border-line bg-panel px-4 py-3 shadow-card sm:static sm:order-2 sm:flex sm:flex-row sm:items-center sm:gap-4 sm:border-0 sm:p-0 sm:shadow-none`}
      >
        <AirportPicker
          airports={AIRPORTS}
          selectedCode={airportCode}
          onSelect={(code) => {
            onSelectAirport(code);
            setIsMenuOpen(false);
          }}
        />
        <FlightSearch
          flights={flights}
          onPick={(flight) => {
            onPickFlight(flight);
            setIsMenuOpen(false);
          }}
        />
      </div>
    </header>
  );
}
