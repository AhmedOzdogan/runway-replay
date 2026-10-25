"""Where a flight came from and where it went, worked out from the aircraft's whole day.

ADS-B carries no route: an aircraft broadcasts where it is, not where it is going. But the daily
dump holds every aircraft's whole day worldwide, so a departure can be followed to wherever it
next comes down. Most airports have no ground coverage at all, so "landed" means the trace ends,
or pauses for a long time, or the aircraft stands still — while it is low.
"""

import math
from typing import NamedTuple

from airport_lookup import ReferenceAirport, nearest_airport

# Positions inside a raw adsb.lol trace point (see docs/data-format.md): lat before lon.
TIME, LAT, LON, ALTITUDE = 0, 1, 2, 3

MAX_LANDING_ALTITUDE_FT = 4_000
MIN_TRACE_GAP_SECONDS = 900  # a quarter of an hour without a position: it is on the ground
# Somewhere with ground coverage the aircraft keeps transmitting after it lands, so there is no
# silence to spot. Standing still this long is the other way to know it has arrived.
MIN_GROUND_STAY_SECONDS = 600
# A landing sooner or nearer than this is the departure airport's own coverage gap, not an arrival.
MIN_FLIGHT_SECONDS = 1_200
MIN_FLIGHT_KM = 50
KM_PER_DEGREE_LAT = 110.57
KM_PER_DEGREE_LON_AT_EQUATOR = 111.32

# A measured flight time is only published when it fits the distance. An aircraft can land where
# no receiver sees it and turn up hours later somewhere else, which would make a 50-minute hop
# look like seven hours; better to say nothing than to say that.
CRUISE_KM_PER_HOUR = 800
TURNAROUND_HOURS = 0.75  # taxi, climb and descent, which no cruise speed covers
PLAUSIBLE_FACTOR = 2.0


class Landing(NamedTuple):
    time: float
    lat: float
    lon: float


class Leg(NamedTuple):
    """Where a flight came down, and when: the two together give its length."""

    airport: ReferenceAirport
    at: float


def distance_km(from_lat: float, from_lon: float, to_lat: float, to_lon: float) -> float:
    """Flat-earth distance: a few percent out over a continent, which is all this needs."""
    north_km = (to_lat - from_lat) * KM_PER_DEGREE_LAT
    east_km = (
        (to_lon - from_lon)
        * KM_PER_DEGREE_LON_AT_EQUATOR
        * math.cos(math.radians((from_lat + to_lat) / 2))
    )
    return math.hypot(north_km, east_km)


def looks_plausible(km: float, hours: float) -> bool:
    """Could a flight of this length really have taken this long?"""
    expected = km / CRUISE_KM_PER_HOUR + TURNAROUND_HOURS
    return 0 < hours <= expected * PLAUSIBLE_FACTOR


def landings(trace: dict, day_start: int) -> list[Landing]:
    """Wherever this aircraft came down: it arrived there, and stayed.

    A landing is a run of low points that ends with the trace, with a long silence, or with the
    aircraft standing on the ground for a while. The *time* is the start of that run, when it came
    down through MAX_LANDING_ALTITUDE_FT, because an aircraft can sit at a stand transmitting for
    hours afterwards and the end of the run would make a 50-minute flight look like seven. The
    *position* is the end of it, by then on the airport.
    """
    seconds_offset = trace["timestamp"] - day_start
    points = trace["trace"]
    found: list[Landing] = []
    run_started_at: float | None = None
    came_down_in_run = False
    seconds_on_ground = 0.0
    is_recorded = False

    for index, point in enumerate(points):
        altitude = 0 if point[ALTITUDE] == "ground" else point[ALTITUDE]
        is_low = altitude is not None and altitude <= MAX_LANDING_ALTITUDE_FT
        if not is_low:
            run_started_at, came_down_in_run = None, False
            seconds_on_ground, is_recorded = 0.0, False
            continue

        if run_started_at is None:
            run_started_at = point[TIME] + seconds_offset
        came_down_in_run = came_down_in_run or altitude > 0
        if altitude == 0 and index > 0:
            seconds_on_ground += point[TIME] - points[index - 1][TIME]

        is_last = index == len(points) - 1
        gap = 0 if is_last else points[index + 1][TIME] - point[TIME]
        has_stopped = (
            is_last or gap >= MIN_TRACE_GAP_SECONDS or seconds_on_ground >= MIN_GROUND_STAY_SECONDS
        )
        # A run that never leaves the ground is an aircraft at a stand that started transmitting
        # again, not an arrival.
        if has_stopped and came_down_in_run and not is_recorded:
            found.append(Landing(run_started_at, point[LAT], point[LON]))
            is_recorded = True
    return found


def _is_a_real_leg(home_lat: float, home_lon: float, landing: Landing, since: float) -> bool:
    """A touchdown just after takeoff and just next door is a coverage gap, not another airport."""
    if landing.time < since + MIN_FLIGHT_SECONDS:
        return False
    return distance_km(home_lat, home_lon, landing.lat, landing.lon) >= MIN_FLIGHT_KM


def airport_after(
    arrivals: list[Landing],
    left_at: float,
    home_lat: float,
    home_lon: float,
    reference: list[ReferenceAirport],
) -> Leg | None:
    """Where and when the aircraft came down after leaving here, or None when we can't tell."""
    for landing in arrivals:
        if not _is_a_real_leg(home_lat, home_lon, landing, left_at):
            continue
        airport = nearest_airport(landing.lat, landing.lon, reference)
        return Leg(airport, landing.time) if airport else None
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
        if distance_km(home_lat, home_lon, landing.lat, landing.lon) < MIN_FLIGHT_KM:
            continue  # it was here, not somewhere else
        return nearest_airport(landing.lat, landing.lon, reference)
    return None
