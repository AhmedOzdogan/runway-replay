"""Split filtered points into flights and thin them to a fixed time step."""

MAX_GAP_S = 300  # a longer gap means the aircraft left the zone or parked: new flight


def split_flights(points: list, max_gap_s: int = MAX_GAP_S) -> list[list]:
    """Split time-ordered points wherever consecutive points are more than `max_gap_s` apart."""
    flights = []
    for p in points:
        if not flights or p[0] - flights[-1][-1][0] > max_gap_s:
            flights.append([])
        flights[-1].append(p)
    return flights


def resample(points: list, step_s: int = 5) -> list:
    """Keep at most one point per `step_s` seconds, as rounded [sec_offset, lon, lat, alt_ft].

    The last point is always kept so a flight ends where it really ended.
    """
    out = []
    last_t = None
    for i, (t, lon, lat, alt, *_) in enumerate(points):
        if last_t is None or t - last_t >= step_s or i == len(points) - 1:
            out.append([round(t), round(lon, 4), round(lat, 4), round(alt)])
            last_t = t
    return out
