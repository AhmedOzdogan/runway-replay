from filter import filter_points
from resample import resample, split_flights

MUC = (48.3538, 11.7861)


def pt(t, lat, lon, alt, gs=150, flight=None):
    return [t, lat, lon, alt, gs, 0, 0, 0, {"flight": f"{flight}   "} if flight else None]


def test_filter_keeps_only_points_in_zone():
    points = [
        pt(0, 48.35, 11.78, 3000, flight="DLH1AB"),  # in zone, sets callsign
        pt(10, 48.35, 11.78, 20000),  # too high
        pt(20, 49.50, 11.78, 3000),  # ~128 km north
        pt(30, 48.35, 11.79, "ground", gs=15),  # taxiing
        pt(40, 48.35, 11.79, "ground", gs=0),  # parked
    ]
    assert filter_points(points, MUC) == [
        [0, 11.78, 48.35, 3000, "DLH1AB"],
        [30, 11.79, 48.35, 0, "DLH1AB"],
    ]


def test_split_and_resample():
    points = [[t, 11.781234, 48.351234, 1000.4, None] for t in (0, 2, 5, 7, 11, 1000, 1004)]
    flights = split_flights(points)
    assert [len(f) for f in flights] == [5, 2]
    assert resample(flights[0]) == [
        [0, 11.7812, 48.3512, 1000],
        [5, 11.7812, 48.3512, 1000],
        [11, 11.7812, 48.3512, 1000],
    ]
