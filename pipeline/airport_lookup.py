"""Which airport is a position at? Used to tell this airport's traffic from a neighbour's.

The reference list is airports_reference.csv: the large and medium airports of
https://ourairports.com/data/ (public domain), trimmed to icao,city,lat,lon.
"""

import csv
import math
from pathlib import Path
from typing import NamedTuple

REFERENCE_PATH = Path(__file__).resolve().parent / "airports_reference.csv"

# A plane can drop out of coverage a few kilometres short of the runway, so "at" is generous.
MAX_DISTANCE_KM = 20
KM_PER_DEGREE_LAT = 110.57
KM_PER_DEGREE_LON_AT_EQUATOR = 111.32


class ReferenceAirport(NamedTuple):
    icao: str
    city: str
    lat: float
    lon: float


def load_reference(path: Path = REFERENCE_PATH) -> list[ReferenceAirport]:
    with open(path, newline="", encoding="utf-8") as file:
        return [
            ReferenceAirport(row["icao"], row["city"], float(row["lat"]), float(row["lon"]))
            for row in csv.DictReader(file)
        ]


def nearest_airport(
    lat: float,
    lon: float,
    reference: list[ReferenceAirport],
    max_distance_km: float = MAX_DISTANCE_KM,
) -> ReferenceAirport | None:
    """The airport this position is at, or None if it isn't at one."""
    km_per_degree_lon = KM_PER_DEGREE_LON_AT_EQUATOR * math.cos(math.radians(lat))
    nearest = None
    nearest_km = max_distance_km
    for airport in reference:
        north_km = (airport.lat - lat) * KM_PER_DEGREE_LAT
        if abs(north_km) > nearest_km:  # cheap reject before the square root
            continue
        east_km = (airport.lon - lon) * km_per_degree_lon
        distance_km = math.hypot(north_km, east_km)
        if distance_km < nearest_km:
            nearest, nearest_km = airport, distance_km
    return nearest
