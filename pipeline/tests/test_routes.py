from airport_lookup import ReferenceAirport, nearest_airport
from airports import Airport
from process import route_ends, uses_this_airport
from routes import Landing, airport_after, airport_before

MUC = Airport(48.3538, 11.7861, "EDDM")
REFERENCE = [
    ReferenceAirport("EDDM", "Munich", 48.3538, 11.7861),
    ReferenceAirport("EDML", "Landshut", 48.5181, 12.0150),
    ReferenceAirport("EDDH", "Hamburg", 53.6304, 9.9882),
]


def point(time, lon, lat, altitude):
    """A resampled flight point: [seconds, lon, lat, altitude_ft]."""
    return [time, lon, lat, altitude]


def test_a_flight_at_this_airport_is_kept():
    departure = [point(0, 11.7861, 48.3538, 0), point(60, 11.9, 48.4, 6000)]
    assert uses_this_airport(departure, MUC, REFERENCE)


def test_a_neighbours_traffic_is_not_ours():
    # Lands at Landshut, 25 km away, but passes through Munich's 50 km zone on the way.
    landshut = [point(0, 12.2, 48.6, 5000), point(60, 12.0150, 48.5181, 0)]
    assert not uses_this_airport(landshut, MUC, REFERENCE)


def test_an_overflight_stays():
    """Nowhere near an airport: traffic passing this one, not another airport's."""
    overflight = [point(0, 11.4, 48.1, 9000), point(60, 11.9, 48.2, 9000)]
    assert uses_this_airport(overflight, MUC, REFERENCE)


def test_destination_is_where_it_next_came_down():
    departure = [point(0, 11.7861, 48.3538, 0), point(600, 11.9, 48.6, 9000)]
    arrivals = [Landing(5000, 53.6304, 9.9882)]  # Hamburg, hours later
    origin, destination = route_ends(departure, MUC, arrivals, REFERENCE)
    assert origin is None
    assert destination == {"icao": "EDDH", "city": "Hamburg"}


def test_no_destination_when_the_day_ends_first():
    departure = [point(0, 11.7861, 48.3538, 0), point(600, 11.9, 48.6, 9000)]
    assert route_ends(departure, MUC, [], REFERENCE) == (None, None)


def test_origin_is_where_it_last_came_down():
    arrival = [point(5000, 11.9, 48.6, 9000), point(5600, 11.7861, 48.3538, 0)]
    arrivals = [Landing(1000, 53.6304, 9.9882)]  # was in Hamburg this morning
    origin, destination = route_ends(arrival, MUC, arrivals, REFERENCE)
    assert origin == {"icao": "EDDH", "city": "Hamburg"}
    assert destination is None


def test_a_gap_just_after_takeoff_is_not_a_destination():
    """Coverage can drop on climb-out; that is not an arrival somewhere else."""
    just_next_door = [Landing(700, 48.5181, 12.0150)]  # Landshut, a minute later
    assert airport_after(just_next_door, 600, MUC.lat, MUC.lon, REFERENCE) is None


def test_landing_back_home_is_not_an_origin():
    assert airport_before([Landing(10, 48.3538, 11.7861)], 500, MUC.lat, MUC.lon, REFERENCE) is None


def test_nowhere_near_an_airport():
    assert nearest_airport(45.0, -30.0, REFERENCE) is None
