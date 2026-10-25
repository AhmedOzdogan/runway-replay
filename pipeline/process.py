"""CLI: python process.py --airport MUC IST HAN --date 2026-10-18

Streams the adsb.lol dump for one day once and writes one file per airport:
../web/public/data/<AIRPORT>-<DATE>.json.gz, plus latest.json naming that date.
"""

import argparse
import gzip
import json
import sys
from datetime import UTC, datetime
from pathlib import Path

from airport_lookup import ReferenceAirport, load_reference, nearest_airport
from airports import AIRPORTS, Airport
from download import stream_dump
from filter import filter_points
from resample import resample, split_flights
from routes import (
    Landing,
    Leg,
    airport_after,
    airport_before,
    distance_km,
    landings,
    looks_plausible,
)

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "web" / "public" / "data"

# Below this a flight counts as "at the airport", for telling arrivals from departures. Istanbul
# showed that "on the ground" is useless: most airports have no surface coverage at all.
MAX_LOW_ALTITUDE_FT = 4_000


# Positions inside a resampled flight point (see types/flight.ts).
OUT_TIME, OUT_LON, OUT_LAT, OUT_ALTITUDE = 0, 1, 2, 3


def uses_this_airport(points: list, airport: Airport, reference: list[ReferenceAirport]) -> bool:
    """False for a neighbour's traffic: 60% of Heathrow's 50 km zone is Gatwick, Luton and City.

    A flight belongs to the airport nearest its lowest point. Coming down near no airport at all
    is an overflight, which we keep: it is traffic passing this airport, not another airport's.
    """
    lowest = min(points, key=lambda point: point[OUT_ALTITUDE])
    used = nearest_airport(lowest[OUT_LAT], lowest[OUT_LON], reference)
    return used is None or used.icao == airport.icao


def flight_hours(airport: Airport, leg: Leg, left_at: float) -> float | None:
    """How long the flight took, or None when the answer doesn't fit the distance."""
    hours = (leg.at - left_at) / 3600
    km = distance_km(airport.lat, airport.lon, leg.airport.lat, leg.airport.lon)
    return hours if looks_plausible(km, hours) else None


def named(found: ReferenceAirport | Leg | None, hours: float | None = None) -> dict | None:
    """The airport as it goes into the file: the code to match on, the city to show.

    A destination also carries `at`, the second of the day it came down there, so the app can say
    how long the flight took. An origin can't: the day's data says when the aircraft last landed
    there, not when it left.
    """
    if found is None:
        return None
    if isinstance(found, Leg):
        named_leg = {"icao": found.airport.icao, "city": found.airport.city}
        # Only a flight time that fits the distance is published; the app shows "—" without it.
        if hours is not None:
            named_leg["at"] = round(found.at)
        return named_leg
    return {"icao": found.icao, "city": found.city}


def route_ends(
    points: list,
    airport: Airport,
    arrivals: list[Landing],
    reference: list[ReferenceAirport],
) -> tuple[dict | None, dict | None]:
    """(origin, destination), each {"icao", "city"} or None when the day's data can't say."""
    starts_low = points[0][OUT_ALTITUDE] <= MAX_LOW_ALTITUDE_FT
    ends_low = points[-1][OUT_ALTITUDE] <= MAX_LOW_ALTITUDE_FT
    origin = destination = None
    if ends_low and not starts_low:  # arrived here
        origin = airport_before(arrivals, points[0][OUT_TIME], airport.lat, airport.lon, reference)
    if starts_low and not ends_low:  # left from here
        destination = airport_after(
            arrivals, points[-1][OUT_TIME], airport.lat, airport.lon, reference
        )
    hours = flight_hours(airport, destination, points[-1][OUT_TIME]) if destination else None
    return named(origin), named(destination, hours)


def flights_near(
    trace: dict,
    airport: Airport,
    day_start: int,
    reference: list[ReferenceAirport] | None = None,
    arrivals: list[Landing] | None = None,
) -> list[dict]:
    """Turn one aircraft's day (a decoded trace file) into flights near `airport`."""
    # Point times in the file are relative to trace["timestamp"]; re-base them on the day start.
    seconds_offset = trace["timestamp"] - day_start
    points = [
        [point[0] + seconds_offset, *point[1:]] for point in filter_points(trace["trace"], airport)
    ]
    flights = []
    for flight_points in split_flights(points):
        if len(flight_points) < 2:
            continue
        resampled = resample(flight_points)
        if reference is not None and not uses_this_airport(resampled, airport, reference):
            continue
        origin, destination = (
            route_ends(resampled, airport, arrivals, reference)
            if reference is not None and arrivals is not None
            else (None, None)
        )
        flights.append(
            {
                "icao": trace["icao"],
                "registration": trace.get("r"),
                "type": trace.get("t"),
                # ponytail: callsign of the last point, i.e. the latest seen; right for arrivals
                # and departures, can be stale if a flight never re-broadcasts it in the zone.
                "callsign": flight_points[-1][4],
                # Latest ADS-B emitter category seen, e.g. "A3" (airliner) or "C2" (ground vehicle).
                "category": flight_points[-1][5],
                "origin": origin,
                "destination": destination,
                "points": resampled,
            }
        )
    return flights


def main() -> None:
    parser = argparse.ArgumentParser(description="Build airport-day replay files.")
    parser.add_argument("--airport", required=True, nargs="+", choices=sorted(AIRPORTS))
    parser.add_argument("--date", required=True, help="YYYY-MM-DD")
    args = parser.parse_args()

    day_start = int(datetime.fromisoformat(args.date).replace(tzinfo=UTC).timestamp())
    flights_by_airport = {code: [] for code in args.airport}

    reference = load_reference()
    for aircraft_count, trace in enumerate(stream_dump(args.date), 1):
        # Where this aircraft came down during the day, computed once and shared by the airports.
        arrivals = landings(trace, day_start)
        for code in args.airport:
            flights_by_airport[code].extend(
                flights_near(trace, AIRPORTS[code], day_start, reference, arrivals)
            )
        if aircraft_count % 10_000 == 0:
            counts = ", ".join(f"{code} {len(found)}" for code, found in flights_by_airport.items())
            print(f"{aircraft_count} aircraft read; flights: {counts}", file=sys.stderr)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for code, airport_flights in flights_by_airport.items():
        airport_flights.sort(key=lambda flight: flight["points"][0][0])
        output_path = OUTPUT_DIR / f"{code}-{args.date}.json.gz"
        data = {
            "airport": code,
            "date": args.date,
            "dayStart": day_start,
            "flights": airport_flights,
        }
        with gzip.open(output_path, "wt") as output_file:
            json.dump(data, output_file, separators=(",", ":"))
        size_mb = output_path.stat().st_size / 1e6
        print(f"{output_path}: {len(airport_flights)} flights, {size_mb:.1f} MB")

    # The web app reads this to know which day to load.
    (OUTPUT_DIR / "latest.json").write_text(json.dumps({"date": args.date}))


if __name__ == "__main__":
    main()
