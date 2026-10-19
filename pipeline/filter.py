"""Keep only aircraft that come near the airport."""


def near_airport(trace: dict, airport: tuple[float, float]) -> bool:
    """True if any point of `trace` is within ~50 km of `airport` and below ~15,000 ft."""
    # TODO: haversine distance + altitude check ("ground" counts as 0)
    raise NotImplementedError
