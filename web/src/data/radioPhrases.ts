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
    [
      atc(
        "{callsign}, turn onto heading {heading}, vectors for ILS approach runway {runway}.",
      ),
      pilot("Heading {heading}, vectors ILS runway {runway}, {callsign}."),
    ],
    [
      atc(
        "{callsign}, descend to {altitude}, reduce to minimum approach speed.",
      ),
      pilot("Descend to {altitude}, minimum approach speed, {callsign}."),
    ],
    [
      pilot("{airport} approach, good day, {callsign}, {altitude}, inbound."),
      atc(
        "{callsign}, {airport} approach, radar contact, descend to {altitude}, expect runway {runway}.",
      ),
      pilot("Descend to {altitude}, expect runway {runway}, {callsign}."),
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
    [
      atc("{callsign}, contact tower, good day."),
      pilot("Contact tower, good day, {callsign}."),
      pilot("{airport} tower, {callsign}, on the ILS runway {runway}."),
      atc("{callsign}, {airport} tower, continue approach, I will call you."),
      pilot("Continue approach, {callsign}."),
      atc("{callsign}, runway {runway}, cleared to land."),
      pilot("Cleared to land runway {runway}, {callsign}."),
    ],
    [
      pilot("{airport} tower, {callsign}, final runway {runway}."),
      atc("{callsign}, runway {runway}, cleared to land."),
      pilot("Cleared to land {runway}, {callsign}."),
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
    [
      atc(
        "{callsign}, vacate via the next available exit, contact ground when vacated.",
      ),
      pilot("Next available exit, ground when vacated, {callsign}."),
    ],
    [
      pilot(
        "{airport} ground, {callsign}, runway vacated, request taxi to the stand.",
      ),
      atc("{callsign}, taxi to the stand, follow the marshaller."),
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
    [
      pilot("{airport} ground, {callsign}, request push and start."),
      atc("{callsign}, push and start approved."),
      pilot("Push and start approved, {callsign}."),
      pilot("{callsign}, request taxi."),
      atc("{callsign}, taxi to holding point runway {runway}."),
      pilot("Holding point runway {runway}, {callsign}."),
    ],
    [
      atc(
        "{callsign}, continue taxi to holding point runway {runway}, contact tower.",
      ),
      pilot("Holding point runway {runway}, contact tower, {callsign}."),
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
    [
      pilot(
        "{airport} tower, {callsign}, holding point runway {runway}, ready.",
      ),
      atc("{callsign}, line up and wait runway {runway}."),
      pilot("Lining up runway {runway}, {callsign}."),
      atc("{callsign}, runway {runway}, cleared for take-off."),
      pilot("Cleared for take-off, {callsign}."),
    ],
    [
      atc(
        "{callsign}, behind the departing traffic, line up and wait runway {runway}.",
      ),
      pilot(
        "Behind the traffic, line up and wait runway {runway}, {callsign}.",
      ),
      atc("{callsign}, runway {runway}, cleared for take-off."),
      pilot("Cleared for take-off runway {runway}, {callsign}."),
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
    [
      atc("{callsign}, climb to {altitude}, contact departure, good day."),
      pilot("Climb to {altitude}, departure, good day, {callsign}."),
    ],
    [
      pilot(
        "{airport} departure, {callsign}, airborne, climbing to {altitude}.",
      ),
      atc(
        "{callsign}, radar contact, continue climb, turn onto heading {heading}.",
      ),
      pilot("Continue climb, heading {heading}, {callsign}."),
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
      pilot("{callsign}, going around."),
      atc(
        "{callsign}, roger, climb to {altitude}, you'll be vectored for another approach runway {runway}.",
      ),
      pilot("Climb to {altitude}, vectors runway {runway}, {callsign}."),
    ],
    [
      pilot("{airport} tower, {callsign}, going around."),
      atc("{callsign}, roger, climb to {altitude}, report when able."),
      pilot("Climb to {altitude}, will report, {callsign}."),
    ],
    [
      atc("{callsign}, go around, I say again, go around, acknowledge."),
      pilot("Going around, {callsign}."),
      atc(
        "{callsign}, climb to {altitude}, report ready for another approach.",
      ),
      pilot("Climb to {altitude}, wilco, {callsign}."),
    ],
    [
      pilot("{callsign}, going around, will call you back."),
      atc(
        "{callsign}, roger, fly runway heading, climb to {altitude}, contact approach.",
      ),
      pilot("Runway heading, climb to {altitude}, approach, {callsign}."),
    ],
    [
      pilot("{callsign}, missed approach, climbing to {altitude}."),
      atc(
        "{callsign}, roger, turn onto heading {heading}, expect vectors for runway {runway}.",
      ),
      pilot("Heading {heading}, vectors runway {runway}, {callsign}."),
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
    [
      atc(
        "{callsign}, identified, maintain {altitude}, fly heading {heading}.",
      ),
      pilot("Maintain {altitude}, heading {heading}, {callsign}."),
    ],
    [
      pilot("{airport} approach, {callsign}, maintaining {altitude}."),
      atc("{callsign}, roger, radar contact."),
      pilot("{callsign}."),
    ],
  ],
};
