from airport_lookup import ReferenceAirport, nearest_airport
from airports import Airport
from process import route_ends, uses_this_airport
from routes import Landing, airport_after, airport_before, landings, looks_plausible

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
    # `at` is the second of the day it came down, so the app can work out how long it flew.
    assert destination == {"icao": "EDDH", "city": "Hamburg", "at": 5000}


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


def test_a_landing_is_timed_from_the_descent_not_the_last_transmission():
    """An aircraft can sit at the gate transmitting for hours; that is not when it landed."""
    trace = {
        "timestamp": 0,
        "trace": [
            [0, 48.35, 11.78, "ground"],  # standing at Munich
            [600, 48.6, 11.9, 9000],  # climbing away
            [3600, 53.63, 9.98, 3000],  # coming down into Hamburg an hour later
            [3900, 53.63, 9.98, "ground"],  # touchdown
            [20000, 53.63, 9.98, "ground"],  # still parked, hours later, then silence
        ],
    }
    found = landings(trace, 0)
    assert [landing.time for landing in found] == [3600]


def test_a_climb_through_the_low_band_is_not_a_landing():
    trace = {
        "timestamp": 0,
        "trace": [
            [0, 48.35, 11.78, "ground"],
            [300, 48.4, 11.8, 2000],
            [600, 48.6, 11.9, 9000],
        ],
    }
    assert landings(trace, 0) == []


def test_a_landing_is_found_where_the_aircraft_keeps_transmitting_on_the_ground():
    """Frankfurt has ground coverage: no silence follows the landing, it just sits there."""
    trace = {
        "timestamp": 0,
        "trace": [
            [0, 48.35, 11.78, "ground"],  # Munich
            [600, 48.6, 11.9, 9000],  # climbing away
            [3000, 50.03, 8.57, 3000],  # coming down into Frankfurt at 50 min
            [3300, 50.03, 8.57, "ground"],  # touchdown, and it keeps transmitting…
            [3900, 50.03, 8.57, "ground"],
            [4500, 50.03, 8.57, "ground"],
            [20000, 50.03, 8.57, "ground"],
        ],
    }
    assert [landing.time for landing in landings(trace, 0)] == [3000]


def test_a_flight_time_has_to_fit_the_distance():
    """Munich to Frankfurt is 300 km: 50 minutes is a flight, seven hours is a lost aircraft."""
    assert looks_plausible(300, 0.9)
    assert not looks_plausible(300, 7.0)


def test_a_long_flight_is_allowed_to_be_long():
    assert looks_plausible(3000, 4.5)
    assert not looks_plausible(3000, 12.2)
