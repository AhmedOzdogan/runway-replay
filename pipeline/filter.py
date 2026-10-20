"""Keep only the trace points near an airport."""

import math

RADIUS_KM = 50
MAX_ALTITUDE_FT = 15_000
MIN_GROUND_SPEED_KNOTS = 3  # drop parked aircraft, keep taxiing
KM_PER_DEGREE_LAT = 110.57
KM_PER_DEGREE_LON_AT_EQUATOR = 111.32

# Positions inside a raw adsb.lol trace point (see docs/data-format.md).
TIME, LAT, LON, ALTITUDE, GROUND_SPEED, DETAILS = 0, 1, 2, 3, 4, 8


def filter_points(trace_points: list, airport: tuple[float, float]) -> list:
    """Return [seconds, lon, lat, altitude_ft, callsign, category] for points in the airport zone.

    The zone is RADIUS_KM around `airport` and below MAX_ALTITUDE_FT. `callsign` and `category`
    (ADS-B emitter category, e.g. "A3" or "C2") are the latest ones seen on any point so far:
    adsb.lol only sends them on some points.
    """
    airport_lat, airport_lon = airport
    km_per_degree_lon = KM_PER_DEGREE_LON_AT_EQUATOR * math.cos(math.radians(airport_lat))
    callsign = None
    category = None
    kept_points = []
    for point in trace_points:
        details = point[DETAILS] if len(point) > DETAILS else None
        if details and details.get("flight"):
            callsign = details["flight"].strip() or callsign
        if details and details.get("category"):
            category = details["category"]

        altitude = point[ALTITUDE]
        if altitude == "ground":
            ground_speed = point[GROUND_SPEED]
            if ground_speed is None or ground_speed < MIN_GROUND_SPEED_KNOTS:
                continue
            altitude = 0
        elif altitude is None or altitude > MAX_ALTITUDE_FT:
            continue

        # Flat-earth distance: accurate to well under 1% at 50 km.
        east_km = (point[LON] - airport_lon) * km_per_degree_lon
        north_km = (point[LAT] - airport_lat) * KM_PER_DEGREE_LAT
        if east_km**2 + north_km**2 <= RADIUS_KM**2:
            kept_points.append([point[TIME], point[LON], point[LAT], altitude, callsign, category])
    return kept_points
