"""CLI: python process.py --airport MUC IST HAN --date 2026-10-18

Streams the adsb.lol dump for one day once and writes one file per airport:
../web/public/data/<AIRPORT>-<DATE>.json.gz
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

OUT_DIR = Path(__file__).resolve().parent.parent / "web" / "public" / "data"


def flights_near(trace: dict, airport: tuple[float, float], day_start: int) -> list[dict]:
    """Turn one aircraft's day (a decoded trace file) into flights near `airport`."""
    # sec_offset in the file is relative to trace["timestamp"]; re-base it on the day start.
    shift = trace["timestamp"] - day_start
    points = [[p[0] + shift, *p[1:]] for p in filter_points(trace["trace"], airport)]
    flights = []
    for segment in split_flights(points):
        if len(segment) < 2:
            continue
        flights.append(
            {
                "icao": trace["icao"],
                "registration": trace.get("r"),
                "type": trace.get("t"),
                # ponytail: callsign of the last point, i.e. the latest seen; right for arrivals
                # and departures, can be stale if a flight never re-broadcasts it in the zone.
                "callsign": segment[-1][4],
                "points": resample(segment),
            }
        )
    return flights


def main() -> None:
    p = argparse.ArgumentParser(description="Build airport-day replay files.")
    p.add_argument("--airport", required=True, nargs="+", choices=sorted(AIRPORTS))
    p.add_argument("--date", required=True, help="YYYY-MM-DD")
    args = p.parse_args()

    day_start = int(datetime.fromisoformat(args.date).replace(tzinfo=UTC).timestamp())
    flights = {code: [] for code in args.airport}

    for n, trace in enumerate(stream_dump(args.date), 1):
        for code in args.airport:
            flights[code].extend(flights_near(trace, AIRPORTS[code], day_start))
        if n % 10_000 == 0:
            counts = ", ".join(f"{c} {len(f)}" for c, f in flights.items())
            print(f"{n} aircraft read; flights: {counts}", file=sys.stderr)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for code, airport_flights in flights.items():
        airport_flights.sort(key=lambda f: f["points"][0][0])
        out = OUT_DIR / f"{code}-{args.date}.json.gz"
        data = {
            "airport": code,
            "date": args.date,
            "dayStart": day_start,
            "flights": airport_flights,
        }
        with gzip.open(out, "wt") as f:
            json.dump(data, f, separators=(",", ":"))
        print(f"{out}: {len(airport_flights)} flights, {out.stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
