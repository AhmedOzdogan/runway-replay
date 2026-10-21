import { TbHelpCircle } from "react-icons/tb";
import icon1x from "../assets/icon@1x.png";
import icon2x from "../assets/icon@2x.png";
import icon3x from "../assets/icon@3x.png";
import logo1x from "../assets/logo@1x.png";
import logo2x from "../assets/logo@2x.png";
import logo3x from "../assets/logo@3x.png";
import { AIRPORTS } from "../data/airports";
import { AirportPicker } from "./AirportPicker";

interface HeaderProps {
  airportCode: string;
  status: string;
  onSelectAirport: (code: string) => void;
  onOpenHelp: () => void;
}

export function Header({
  airportCode,
  status,
  onSelectAirport,
  onOpenHelp,
}: HeaderProps) {
  return (
    <header className="flex flex-wrap items-center gap-4 border-b border-line bg-panel px-4 py-2.5">
      <h1>
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
      <AirportPicker
        airports={AIRPORTS}
        selectedCode={airportCode}
        onSelect={onSelectAirport}
      />
      <span role="status" className="ml-auto text-[13px] text-muted">
        {status}
      </span>
      <button
        type="button"
        onClick={onOpenHelp}
        aria-label="About Runway Replay and how to use it"
        title="About & help"
        className="flex size-8 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-white/5 hover:text-neon"
      >
        <TbHelpCircle size={22} aria-hidden="true" />
      </button>
    </header>
  );
}
