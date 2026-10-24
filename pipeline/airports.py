"""The airports we replay: IATA code -> where it is. Keep in sync with web/src/data/airports.ts.

Chosen for ADS-B coverage, which varies hugely by region: these three have enough ground receivers
to show taxiing and parked aircraft, and enough coverage around them to tell where a departure went
(see docs/data-format.md).
"""

from typing import NamedTuple


class Airport(NamedTuple):
    lat: float
    lon: float
    #: ICAO code, to match against airports_reference.csv.
    icao: str


AIRPORTS = {
    "MUC": Airport(48.3538, 11.7861, "EDDM"),
    "LHR": Airport(51.4700, -0.4543, "EGLL"),
    "AMS": Airport(52.3086, 4.7639, "EHAM"),
}
