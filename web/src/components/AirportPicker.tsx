import type { Airport } from "../types/airport";
import { ToggleButton } from "./ToggleButton";

interface AirportPickerProps {
  airports: Record<string, Airport>;
  selectedCode: string;
  /** The arcade holds the airport while a game runs: its questions belong to this one. */
  isLocked?: boolean;
  onSelect: (code: string) => void;
}

export function AirportPicker({
  airports,
  selectedCode,
  isLocked = false,
  onSelect,
}: AirportPickerProps) {
  return (
    <nav className="flex gap-1.5" aria-label="Airport">
      {Object.entries(airports).map(([code, airport]) => (
        <ToggleButton
          key={code}
          title={isLocked ? "Finish the game to change airport" : code}
          pressed={code === selectedCode}
          disabled={isLocked && code !== selectedCode}
          className={isLocked ? "disabled:opacity-40" : ""}
          onClick={() => onSelect(code)}
        >
          {airport.name}
        </ToggleButton>
      ))}
    </nav>
  );
}
