from filter import filter_points
from resample import resample, split_flights

MUC = (48.3538, 11.7861)


def trace_point(time, lat, lon, altitude, ground_speed=150, callsign=None):
    """A raw adsb.lol trace point; adsb.lol pads callsigns with spaces."""
    details = {"flight": f"{callsign}   "} if callsign else None
    return [time, lat, lon, altitude, ground_speed, 0, 0, 0, details]


def test_filter_keeps_only_points_in_zone():
    points = [
        trace_point(0, 48.35, 11.78, 3000, callsign="DLH1AB"),  # in zone, sets callsign
        trace_point(10, 48.35, 11.78, 20000),  # too high
        trace_point(20, 49.50, 11.78, 3000),  # ~128 km north
        trace_point(30, 48.35, 11.79, "ground", ground_speed=15),  # taxiing
        trace_point(40, 48.35, 11.79, "ground", ground_speed=0),  # parked
    ]
    assert filter_points(points, MUC) == [
        [0, 11.78, 48.35, 3000, "DLH1AB"],
        [30, 11.79, 48.35, 0, "DLH1AB"],
    ]


def test_split_and_resample():
    times = (0, 2, 5, 7, 11, 1000, 1004)
    points = [[time, 11.781234, 48.351234, 1000.4, None] for time in times]
    flights = split_flights(points)
    assert [len(flight) for flight in flights] == [5, 2]
    assert resample(flights[0]) == [
        [0, 11.7812, 48.3512, 1000],
        [5, 11.7812, 48.3512, 1000],
        [11, 11.7812, 48.3512, 1000],
    ]
