"""CLI: python process.py --airport FRA --date 2026-10-18"""

import argparse

from airports import AIRPORTS
from download import stream_dump
from filter import near_airport
from resample import resample


def main() -> None:
    p = argparse.ArgumentParser(description="Build one airport-day replay file.")
    p.add_argument("--airport", required=True, choices=sorted(AIRPORTS))
    p.add_argument("--date", required=True, help="YYYY-MM-DD")
    args = p.parse_args()

    airport = AIRPORTS[args.airport]
    for trace in stream_dump(args.date):
        if near_airport(trace, airport):
            resample(trace["trace"])
    # TODO: collect aircraft, write ../web/public/data/{airport}-{date}.json.gz


if __name__ == "__main__":
    main()
