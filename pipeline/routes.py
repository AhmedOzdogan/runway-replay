"""Where a flight came from and where it went, worked out from the aircraft's whole day.

ADS-B carries no route: an aircraft broadcasts where it is, not where it is going. But the daily
dump holds every aircraft's whole day worldwide, so a departure can be followed to wherever it
next comes down. Most airports have no ground coverage at all, so "landed" means the trace ends,
or pauses for a long time, while the aircraft is low.
"""

from typing import NamedTuple

from airport_lookup import ReferenceAirport, nearest_airport

# Positions inside a raw adsb.lol trace point (see docs/data-format.md): lat before lon.
TIME, LAT, LON, ALTITUDE = 0, 1, 2, 3

MAX_LANDING_ALTITUDE_FT = 4_000
MIN_TRACE_GAP_SECONDS = 900  # a quarter of an hour without a position: it is on the ground
# A landing sooner or nearer than this is the departure airport's own coverage gap, not an arrival.
MIN_FLIGHT_SECONDS = 1_200
MIN_FLIGHT_KM = 50
KM_PER_DEGREE_LAT = 110.57


class Landing(NamedTuple):
    time: float
    lat: float
    lon: float


def landings(trace: dict, day_start: int) -> list[Landing]:
    """Wherever this aircraft dropped out of coverage low: it came down there."""
    seconds_offset = trace["timestamp"] - day_start
    points = trace["trace"]
    found = []
    for index, point in enumerate(points):
        altitude = 0 if point[ALTITUDE] == "ground" else point[ALTITUDE]
        if altitude is None or altitude > MAX_LANDING_ALTITUDE_FT:
            continue
        is_last = index == len(points) - 1
        gap = 0 if is_last else points[index + 1][TIME] - point[TIME]
        if is_last or gap >= MIN_TRACE_GAP_SECONDS:
            found.append(Landing(point[TIME] + seconds_offset, point[LAT], point[LON]))
    return found


def _is_a_real_leg(home_lat: float, home_lon: float, landing: Landing, since: float) -> bool:
    """A touchdown just after takeoff and just next door is a coverage gap, not another airport."""
    if landing.time < since + MIN_FLIGHT_SECONDS:
        return False
    north_km = (landing.lat - home_lat) * KM_PER_DEGREE_LAT
    east_km = (landing.lon - home_lon) * KM_PER_DEGREE_LAT
    return north_km**2 + east_km**2 >= MIN_FLIGHT_KM**2


def airport_after(
    arrivals: list[Landing],
    left_at: float,
    home_lat: float,
    home_lon: float,
    reference: list[ReferenceAirport],
) -> ReferenceAirport | None:
    """Where the aircraft came down after leaving here, or None when we can't tell."""
    for landing in arrivals:
        if not _is_a_real_leg(home_lat, home_lon, landing, left_at):
            continue
        return nearest_airport(landing.lat, landing.lon, reference)
    return None


def airport_before(
    arrivals: list[Landing],
    arrived_at: float,
    home_lat: float,
    home_lon: float,
    reference: list[ReferenceAirport],
) -> ReferenceAirport | None:
    """Where the aircraft last came down before arriving here, or None when we can't tell."""
    earlier = [landing for landing in arrivals if landing.time < arrived_at]
    for landing in reversed(earlier):
        north_km = (landing.lat - home_lat) * KM_PER_DEGREE_LAT
        east_km = (landing.lon - home_lon) * KM_PER_DEGREE_LAT
        if north_km**2 + east_km**2 < MIN_FLIGHT_KM**2:
            continue  # it was here, not somewhere else
        return nearest_airport(landing.lat, landing.lon, reference)
    return None
