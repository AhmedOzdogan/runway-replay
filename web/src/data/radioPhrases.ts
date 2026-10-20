// Simulated ATC radio exchanges, in the style of ICAO phraseology.
//
// Each phase has several variants; one is picked per flight so not every plane says the same.
// A variant is a whole exchange (instruction + readback), picked as one unit so the pilot always
// reads back the instruction that was actually given.
//
// Placeholders, filled with real values from the flight:
//   {callsign}  "Lufthansa four alfa bravo"   {airport}  "Munich"
//   {runway}    "two six"                     {altitude} "three thousand feet" / "flight level one two zero"
//   {heading}   "two six two"
// Only these five are used on purpose: anything else (wind, speeds, frequencies) would be invented.

export type Speaker = "ATC" | "PILOT";

export interface RadioPhrase {
  speaker: Speaker;
  text: string;
}

/** One back-and-forth on the radio, e.g. an instruction and its readback. */
export type Exchange = RadioPhrase[];

export type RadioPhase =
  | "approach"
  | "clearedToLand"
  | "afterLanding"
  | "taxiOut"
  | "takeoff"
  | "afterTakeoff"
  | "goAround"
  | "passing";

const atc = (text: string): RadioPhrase => ({ speaker: "ATC", text });
const pilot = (text: string): RadioPhrase => ({ speaker: "PILOT", text });

export const RADIO_EXCHANGES: Record<RadioPhase, Exchange[]> = {
  // First contact with an arriving flight, still descending towards the airport.
  approach: [
    [
      atc(
        "{callsign}, descend to {altitude}, cleared ILS approach runway {runway}.",
      ),
      pilot(
        "Descend to {altitude}, cleared ILS approach runway {runway}, {callsign}.",
      ),
    ],
    [
      atc(
        "{callsign}, good day, descend to {altitude}, expect ILS approach runway {runway}.",
      ),
      pilot("Descend to {altitude}, expect ILS runway {runway}, {callsign}."),
    ],
    [
      atc(
        "{callsign}, turn onto heading {heading}, descend to {altitude}, report established.",
      ),
      pilot("Heading {heading}, descend to {altitude}, wilco, {callsign}."),
    ],
    [
      pilot(
        "{airport} approach, {callsign}, descending to {altitude}, information received.",
      ),
      atc(
        "{callsign}, {airport} approach, good day, expect ILS approach runway {runway}.",
      ),
      pilot("Expect ILS runway {runway}, {callsign}."),
    ],
    [
      atc(
        "{callsign}, cleared ILS approach runway {runway}, report established on the localizer.",
      ),
      pilot("Cleared ILS runway {runway}, wilco, {callsign}."),
    ],
  ],

  // A minute or two before touchdown.
  clearedToLand: [
    [
      atc("{callsign}, runway {runway}, cleared to land."),
      pilot("Cleared to land runway {runway}, {callsign}."),
    ],
    [
      pilot("{airport} tower, {callsign}, established ILS runway {runway}."),
      atc(
        "{callsign}, {airport} tower, good day, runway {runway}, cleared to land.",
      ),
      pilot("Cleared to land runway {runway}, {callsign}."),
    ],
    [
      atc("{callsign}, continue approach runway {runway}."),
      pilot("Continue approach, {callsign}."),
      atc("{callsign}, runway {runway}, cleared to land."),
      pilot("Cleared to land {runway}, {callsign}."),
    ],
    [
      atc("{callsign}, welcome back, runway {runway}, cleared to land."),
      pilot("Cleared to land runway {runway}, thanks, {callsign}."),
    ],
  ],

  // Just after touchdown, rolling out.
  afterLanding: [
    [
      atc(
        "{callsign}, welcome to {airport}, vacate when able, contact ground.",
      ),
      pilot("Vacate when able, contact ground, {callsign}."),
    ],
    [
      atc(
        "{callsign}, good to see you again, vacate at the next exit, contact ground.",
      ),
      pilot("Next exit, contact ground, {callsign}."),
    ],
    [
      atc(
        "{callsign}, vacate via the first available exit, then contact ground. Welcome to {airport}.",
      ),
      pilot("First available exit, contact ground, thank you, {callsign}."),
    ],
    [
      pilot("{airport} ground, {callsign}, runway {runway} vacated."),
      atc("{callsign}, {airport} ground, welcome, taxi to your stand."),
      pilot("Taxi to the stand, {callsign}."),
    ],
  ],

  // Leaving the gate for the runway.
  taxiOut: [
    [
      pilot("{airport} ground, {callsign}, request taxi."),
      atc("{callsign}, taxi to holding point runway {runway}."),
      pilot("Taxi to holding point runway {runway}, {callsign}."),
    ],
    [
      pilot("{airport} ground, {callsign}, ready to taxi."),
      atc(
        "{callsign}, good day, taxi to holding point runway {runway}, contact tower when ready.",
      ),
      pilot("Holding point runway {runway}, tower when ready, {callsign}."),
    ],
    [
      atc(
        "{callsign}, taxi to holding point runway {runway}, give way to the traffic on your left.",
      ),
      pilot("Holding point runway {runway}, giving way, {callsign}."),
    ],
    [
      pilot("{airport} ground, {callsign}, request taxi, good morning."),
      atc("{callsign}, good morning, taxi to holding point runway {runway}."),
      pilot("Holding point runway {runway}, {callsign}."),
    ],
  ],

  // About a minute before lift-off.
  takeoff: [
    [
      atc("{callsign}, runway {runway}, cleared for take-off."),
      pilot("Cleared for take-off runway {runway}, {callsign}."),
    ],
    [
      atc("{callsign}, runway {runway}, line up and wait."),
      pilot("Line up and wait runway {runway}, {callsign}."),
      atc("{callsign}, runway {runway}, cleared for take-off."),
      pilot("Cleared for take-off {runway}, {callsign}."),
    ],
    [
      pilot(
        "{airport} tower, {callsign}, ready for departure runway {runway}.",
      ),
      atc(
        "{callsign}, runway {runway}, cleared for take-off, have a nice flight.",
      ),
      pilot("Cleared for take-off runway {runway}, thank you, {callsign}."),
    ],
    [
      atc("{callsign}, runway {runway}, cleared for take-off, good day."),
      pilot("Cleared for take-off {runway}, good day, {callsign}."),
    ],
  ],

  // Shortly after lift-off, climbing away.
  afterTakeoff: [
    [
      pilot("{airport} departure, {callsign}, passing {altitude}."),
      atc("{callsign}, radar contact, continue climb."),
      pilot("Continue climb, {callsign}."),
    ],
    [
      atc("{callsign}, contact departure, good day."),
      pilot("Contact departure, good day, {callsign}."),
    ],
    [
      atc(
        "{callsign}, radar contact, climb to {altitude}, turn onto heading {heading}.",
      ),
      pilot("Climb to {altitude}, heading {heading}, {callsign}."),
    ],
    [
      pilot("{airport} departure, {callsign}, climbing through {altitude}."),
      atc("{callsign}, radar contact, have a nice flight."),
      pilot("Thank you, {callsign}."),
    ],
  ],

  // Aborted landing: the pilot calls it, ATC replies with a climb.
  goAround: [
    [
      pilot("{callsign}, going around."),
      atc("{callsign}, roger, climb to {altitude}, fly runway heading."),
      pilot("Climb to {altitude}, runway heading, {callsign}."),
    ],
    [
      pilot("{airport} tower, {callsign}, going around!"),
      atc(
        "{callsign}, roger, follow the published missed approach, contact approach.",
      ),
      pilot("Missed approach, contact approach, {callsign}."),
    ],
    [
      atc("{callsign}, go around, I say again, go around."),
      pilot("Going around, {callsign}."),
      atc("{callsign}, climb to {altitude}, turn onto heading {heading}."),
      pilot("Climb to {altitude}, heading {heading}, {callsign}."),
    ],
    [
      pilot("{callsign}, going around, unstable approach."),
      atc(
        "{callsign}, roger, climb to {altitude}, you'll be vectored for another approach runway {runway}.",
      ),
      pilot("Climb to {altitude}, vectors runway {runway}, {callsign}."),
    ],
  ],

  // Passing through the area without landing or taking off.
  passing: [
    [
      atc("{callsign}, maintain {altitude}, fly heading {heading}."),
      pilot("Maintain {altitude}, heading {heading}, {callsign}."),
    ],
    [
      pilot("{airport} approach, {callsign}, {altitude}, heading {heading}."),
      atc("{callsign}, radar contact, maintain {altitude}."),
      pilot("Maintain {altitude}, {callsign}."),
    ],
    [
      atc(
        "{callsign}, traffic information, an arrival below you, maintain {altitude}.",
      ),
      pilot("Looking out, maintaining {altitude}, {callsign}."),
    ],
    [
      atc("{callsign}, resume own navigation, maintain {altitude}."),
      pilot("Own navigation, maintain {altitude}, {callsign}."),
    ],
  ],
};
