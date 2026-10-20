import { AIRPORTS } from "../data/airports";
import { AirportPicker } from "./AirportPicker";

interface HeaderProps {
  airportCode: string;
  status: string;
  onSelectAirport: (code: string) => void;
}

export function Header({ airportCode, status, onSelectAirport }: HeaderProps) {
  return (
    <header className="flex flex-wrap items-center gap-4 border-b border-line bg-panel px-4 py-2.5">
      <span className="text-lg tracking-wide">
        Sky<b className="text-neon text-shadow-neon">Replay</b>
      </span>
      <AirportPicker
        airports={AIRPORTS}
        selectedCode={airportCode}
        onSelect={onSelectAirport}
      />
      <span role="status" className="ml-auto text-[13px] text-muted">
        {status}
      </span>
    </header>
  );
}
