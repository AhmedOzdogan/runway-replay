"""Keep only the trace points near an airport."""

import math

RADIUS_KM = 50
MAX_ALT_FT = 15_000
MIN_GROUND_SPEED_KT = 3  # drop parked aircraft, keep taxiing


def filter_points(points: list, airport: tuple[float, float]) -> list:
    """Return [sec_offset, lon, lat, alt_ft, callsign] for raw trace points in the airport zone.

    The zone is RADIUS_KM around `airport` and below MAX_ALT_FT. `callsign` is the latest
    callsign seen on any point so far (adsb.lol only sends it on some points).
    """
    lat0, lon0 = airport
    km_per_deg_lon = 111.32 * math.cos(math.radians(lat0))
    callsign = None
    kept = []
    for p in points:
        details = p[8] if len(p) > 8 else None
        if details and details.get("flight"):
            callsign = details["flight"].strip() or callsign

        t, lat, lon, alt, gs = p[0], p[1], p[2], p[3], p[4]
        if alt == "ground":
            if gs is None or gs < MIN_GROUND_SPEED_KT:
                continue
            alt = 0
        elif alt is None or alt > MAX_ALT_FT:
            continue
        # Equirectangular distance: accurate to well under 1% at 50 km.
        dx = (lon - lon0) * km_per_deg_lon
        dy = (lat - lat0) * 110.57
        if dx * dx + dy * dy <= RADIUS_KM * RADIUS_KM:
            kept.append([t, lon, lat, alt, callsign])
    return kept
