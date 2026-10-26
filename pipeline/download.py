"""Stream an adsb.lol daily dump without saving it. See docs/data-format.md."""

import gzip
import json
import os
import tarfile
import urllib.request
from collections.abc import Iterator

RELEASE_API = "https://api.github.com/repos/adsblol/globe_history_{year}/releases/tags/{tag}"

# urlopen waits forever by default, so a connection that goes quiet (a laptop sleeping, a server
# dropping the stream) blocks the whole run. This is per socket operation, not for the download as
# a whole, so a slow but alive stream is unaffected.
SOCKET_TIMEOUT_SECONDS = 60


class ConcatenatedStream:
    """Read several HTTP responses back to back, as one file-like stream."""

    def __init__(self, urls: list[str]):
        self._urls = iter(urls)
        self._response = urllib.request.urlopen(next(self._urls), timeout=SOCKET_TIMEOUT_SECONDS)

    def read(self, size: int = -1) -> bytes:
        while True:
            chunk = self._response.read(size)
            if chunk:
                return chunk
            self._response.close()
            next_url = next(self._urls, None)
            if next_url is None:
                return b""
            self._response = urllib.request.urlopen(next_url, timeout=SOCKET_TIMEOUT_SECONDS)


def _asking_github(url: str) -> urllib.request.Request:
    """The API allows 60 requests an hour per IP, which CI runners share with everyone else — and
    that is what a `403: rate limit exceeded` on a nightly run means. A token raises it to 5,000.
    Without one (a laptop) the plain request is fine: this is one call per run.
    """
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    return urllib.request.Request(url, headers=headers)


def dump_urls(date: str) -> list[str]:
    """One day's dump is a tar split into ~2 GB parts (.tar.aa, .tar.ab, ...).

    The number of parts grows with air traffic, so ask the release which ones exist instead of
    guessing: a missing part truncates the stream mid-member ("unexpected end of data").
    """
    tag = f"v{date.replace('-', '.')}-planes-readsb-prod-0"
    with urllib.request.urlopen(
        _asking_github(RELEASE_API.format(year=date[:4], tag=tag)),
        timeout=SOCKET_TIMEOUT_SECONDS,
    ) as response:
        assets = json.load(response)["assets"]
    # Sorted: the parts only form the tar in name order, which the API doesn't promise.
    return sorted(
        asset["browser_download_url"] for asset in assets if f"{tag}.tar." in asset["name"]
    )


def stream_dump(date: str) -> Iterator[dict]:
    """Yield each decoded ./traces/*/trace_full_*.json from the dump for `date`."""
    # ponytail: no retry; a dropped connection means rerunning the whole ~3.5 GB stream.
    # Members are read in memory with extractfile(), never extracted to disk.
    with tarfile.open(fileobj=ConcatenatedStream(dump_urls(date)), mode="r|") as tar:
        for member in tar:
            if not member.isfile() or not member.name.startswith(("./traces/", "traces/")):
                continue
            file_bytes = tar.extractfile(member).read()
            is_gzip = file_bytes[:2] == b"\x1f\x8b"
            yield json.loads(gzip.decompress(file_bytes) if is_gzip else file_bytes)
