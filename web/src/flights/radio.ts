import {
  AIRLINE_RADIO_NAMES,
  NATO_ALPHABET,
  SPOKEN_DIGITS,
} from "../data/names";

// Transition altitude: below it ATC gives altitudes in feet ("three thousand feet"),
// above it in flight levels ("flight level one two zero").
const TRANSITION_ALTITUDE_FT = 10_000;

/** "4AB" -> "four alfa bravo": each letter/digit as a radio word, other characters skipped. */
export function spellOut(text: string): string {
  let spelledText = "";

  for (const char of text) {
    const word = /[0-9]/.test(char)
      ? SPOKEN_DIGITS[Number(char)]
      : NATO_ALPHABET[char];
    if (!word) continue; // e.g. the "-" in a registration like D-AIBD

    if (spelledText.length !== 0) {
      spelledText += " ";
    }
    spelledText += word;
  }
  return spelledText;
}

/** "DLH4AB" -> "Lufthansa four alfa bravo", the way pilots and ATC say a callsign. */
export function spokenCallsign(text: string): string {
  const upper = text.toUpperCase();
  const airlineRadioName = AIRLINE_RADIO_NAMES[upper.slice(0, 3)];

  if (airlineRadioName === undefined) {
    return spellOut(upper);
  }
  const rest = spellOut(upper.slice(3));
  return rest ? `${airlineRadioName} ${rest}` : airlineRadioName;
}

/**
 * 262 -> "two six": runways are named after their direction ÷ 10, always with two digits
 * (ICAO keeps the leading zero: 80 -> "zero eight"). North is runway 36, never 00.
 */
export function runwayFromHeading(heading: number): string {
  const runway = Math.round(heading / 10) || 36;
  return spellOut(String(runway).padStart(2, "0"));
}

/**
 * 2633 -> "two thousand six hundred feet", 12000 -> "flight level one two zero".
 * Rounded to the nearest hundred feet first, so every decision is made on the value we say.
 */
export function spokenAltitude(feet: number): string {
  const roundedFeet = Math.round(feet / 100) * 100;
  if (roundedFeet >= TRANSITION_ALTITUDE_FT) {
    return `flight level ${spellOut(String(roundedFeet / 100))}`;
  }
  if (roundedFeet <= 0) return "ground level";

  const thousands = Math.floor(roundedFeet / 1000);
  const hundreds = Math.floor((roundedFeet % 1000) / 100);
  const parts = [
    thousands > 0 ? `${spellOut(String(thousands))} thousand` : "",
    hundreds > 0 ? `${spellOut(String(hundreds))} hundred` : "",
  ];
  return `${parts.filter(Boolean).join(" ")} feet`;
}

/** 82 -> "zero eight two": always three digits, 0–360, and north is "three six zero". */
export function spokenHeading(heading: number): string {
  const degrees = (Math.round(heading) + 360) % 360 || 360;
  return spellOut(String(degrees).padStart(3, "0"));
}
