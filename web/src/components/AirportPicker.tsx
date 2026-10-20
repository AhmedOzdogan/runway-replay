import type { Airport } from "../types/airport";
import { ToggleButton } from "./ToggleButton";

interface AirportPickerProps {
  airports: Record<string, Airport>;
  selectedCode: string;
  onSelect: (code: string) => void;
}

export function AirportPicker({
  airports,
  selectedCode,
  onSelect,
}: AirportPickerProps) {
  return (
    <nav className="flex gap-1.5" aria-label="Airport">
      {Object.entries(airports).map(([code, airport]) => (
        <ToggleButton
          key={code}
          title={code}
          pressed={code === selectedCode}
          onClick={() => onSelect(code)}
        >
          {airport.name}
        </ToggleButton>
      ))}
    </nav>
  );
}
