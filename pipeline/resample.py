"""Thin trace points to a fixed time step."""


def resample(points: list, step_s: int = 5) -> list:
    """Return points as [sec_offset, lon, lat, alt_ft], one per `step_s` seconds."""
    # TODO: pick/interpolate points, round coordinates
    raise NotImplementedError
