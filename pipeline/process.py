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

from airports import AIRPORTS
from download import stream_dump
from filter import filter_points
from resample import resample, split_flights

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "web" / "public" / "data"


def flights_near(trace: dict, airport: tuple[float, float], day_start: int) -> list[dict]:
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
                "points": resample(flight_points),
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

    for aircraft_count, trace in enumerate(stream_dump(args.date), 1):
        for code in args.airport:
            flights_by_airport[code].extend(flights_near(trace, AIRPORTS[code], day_start))
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
