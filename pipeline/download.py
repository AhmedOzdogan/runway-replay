"""Stream an adsb.lol daily dump without saving it. See docs/data-format.md."""

import gzip
import json
import tarfile
import urllib.request
from collections.abc import Iterator

RELEASE_URL = (
    "https://github.com/adsblol/globe_history_{year}/releases/download/{tag}/{tag}.tar.{part}"
)


class ConcatStream:
    """Read several HTTP responses back to back, as one file-like stream."""

    def __init__(self, urls: list[str]):
        self._urls = iter(urls)
        self._current = urllib.request.urlopen(next(self._urls))

    def read(self, size: int = -1) -> bytes:
        while True:
            chunk = self._current.read(size)
            if chunk:
                return chunk
            self._current.close()
            next_url = next(self._urls, None)
            if next_url is None:
                return b""
            self._current = urllib.request.urlopen(next_url)


def dump_urls(date: str) -> list[str]:
    tag = f"v{date.replace('-', '.')}-planes-readsb-prod-0"
    return [RELEASE_URL.format(year=date[:4], tag=tag, part=p) for p in ("aa", "ab")]


def stream_dump(date: str) -> Iterator[dict]:
    """Yield each decoded ./traces/*/trace_full_*.json from the dump for `date`."""
    # ponytail: no retry; a dropped connection means rerunning the whole ~3.5 GB stream.
    # Members are read in memory with extractfile(), never extracted to disk.
    with tarfile.open(fileobj=ConcatStream(dump_urls(date)), mode="r|") as tar:
        for member in tar:
            if not member.isfile() or not member.name.startswith(("./traces/", "traces/")):
                continue
            raw = tar.extractfile(member).read()
            yield json.loads(gzip.decompress(raw) if raw[:2] == b"\x1f\x8b" else raw)
