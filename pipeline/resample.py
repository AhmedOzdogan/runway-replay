"""Split filtered points into flights and thin them to a fixed time step."""

MAX_GAP_SECONDS = 300  # a longer gap means the aircraft left the zone or parked: new flight


def split_flights(points: list, max_gap_seconds: int = MAX_GAP_SECONDS) -> list[list]:
    """Split time-ordered points wherever two in a row are more than `max_gap_seconds` apart."""
    flights = []
    for point in points:
        seconds_since_previous = point[0] - flights[-1][-1][0] if flights else None
        if seconds_since_previous is None or seconds_since_previous > max_gap_seconds:
            flights.append([])
        flights[-1].append(point)
    return flights


def resample(points: list, step_seconds: int = 5) -> list:
    """Keep at most one point per `step_seconds`, as rounded [seconds, lon, lat, altitude_ft].

    The last point is always kept so a flight ends where it really ended.
    """
    resampled = []
    last_kept_time = None
    for index, (time, lon, lat, altitude, *_) in enumerate(points):
        is_last_point = index == len(points) - 1
        if last_kept_time is None or time - last_kept_time >= step_seconds or is_last_point:
            resampled.append([round(time), round(lon, 4), round(lat, 4), round(altitude)])
            last_kept_time = time
    return resampled
