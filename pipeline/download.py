"""Stream an adsb.lol daily dump. See docs/data-format.md."""

from collections.abc import Iterator


def stream_dump(date: str) -> Iterator[dict]:
    """Yield each decoded traces/*/trace_full_*.json from the dump for `date`."""
    # TODO: concat .tar.aa + .tar.ab over HTTP, tarfile.open(mode="r|"), gunzip + json each trace
    raise NotImplementedError
