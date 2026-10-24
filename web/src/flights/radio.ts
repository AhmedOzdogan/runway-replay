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

/** "thy7jk " -> "THY7JK": the callsign as written in a transcript. */
export function writtenCallsign(callsign: string): string {
  return callsign.trim().toUpperCase();
}

/**
 * 262 -> "26": runways are named after their direction ÷ 10, always with two digits
 * (ICAO keeps the leading zero: 80 -> "08"). North is runway 36, never 00.
 * Headings are normalised first: a westerly one can arrive as -94, which named runway "-9".
 */
export function writtenRunway(heading: number): string {
  const degrees = ((heading % 360) + 360) % 360;
  const runway = Math.round(degrees / 10) % 36 || 36;
  return String(runway).padStart(2, "0");
}

/** 262 -> "two six", 80 -> "zero eight": the runway as said on the radio. */
export function spokenRunway(heading: number): string {
  return spellOut(writtenRunway(heading));
}

/** Rounded to the nearest hundred feet, so the written and spoken forms always agree. */
function roundedAltitude(feet: number): number {
  return Math.round(feet / 100) * 100;
}

/** 2633 -> "2,600 ft", 12000 -> "FL120", 0 -> "ground level". */
export function writtenAltitude(feet: number): string {
  const rounded = roundedAltitude(feet);
  if (rounded >= TRANSITION_ALTITUDE_FT) return `FL${rounded / 100}`;
  if (rounded <= 0) return "ground level";
  return `${rounded.toLocaleString("en")} ft`;
}

/**
 * 2633 -> "two thousand six hundred feet", 12000 -> "flight level one two zero".
 * Rounded to the nearest hundred feet first, so every decision is made on the value we say.
 */
export function spokenAltitude(feet: number): string {
  const rounded = roundedAltitude(feet);
  if (rounded >= TRANSITION_ALTITUDE_FT) {
    return `flight level ${spellOut(String(rounded / 100))}`;
  }
  if (rounded <= 0) return "ground level";

  const thousands = Math.floor(rounded / 1000);
  const hundreds = Math.floor((rounded % 1000) / 100);
  const parts = [
    thousands > 0 ? `${spellOut(String(thousands))} thousand` : "",
    hundreds > 0 ? `${spellOut(String(hundreds))} hundred` : "",
  ];
  return `${parts.filter(Boolean).join(" ")} feet`;
}

/** 82 -> "082": always three digits, 0–360, and north is "360". */
export function writtenHeading(heading: number): string {
  const degrees = (Math.round(heading) + 360) % 360 || 360;
  return String(degrees).padStart(3, "0");
}

/** 82 -> "zero eight two": the heading as said on the radio. */
export function spokenHeading(heading: number): string {
  return spellOut(writtenHeading(heading));
}

/** "Hello {name}" + { name: "Ada" } -> "Hello Ada". Unknown placeholders become "". */
export function fillTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_match, key) => values[key] ?? "");
}

export function stableIndex(seed: string, count: number): number {
  let hash: number = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash % count;
}
