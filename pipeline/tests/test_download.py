import io
import json

import download

TAG = "v2026.10.20-planes-readsb-prod-0"
RELEASE_FILE = "https://github.com/adsblol/globe_history_2026/releases/download"


def fake_release(names):
    """A GitHub release API response listing `names` as assets."""
    assets = [
        {"name": name, "browser_download_url": f"{RELEASE_FILE}/{TAG}/{name}"} for name in names
    ]
    return io.BytesIO(json.dumps({"assets": assets}).encode())


def test_dump_urls_returns_every_part_in_order(monkeypatch):
    # The API lists assets in no particular order, and a release can carry other files.
    monkeypatch.setattr(
        download.urllib.request,
        "urlopen",
        # The real call passes timeout=, which this stub has to tolerate.
        lambda url, **_: fake_release(
            [f"{TAG}.tar.ac", "README.md", f"{TAG}.tar.aa", f"{TAG}.tar.ab"]
        ),
    )
    assert download.dump_urls("2026-10-20") == [
        f"{RELEASE_FILE}/{TAG}/{TAG}.tar.aa",
        f"{RELEASE_FILE}/{TAG}/{TAG}.tar.ab",
        f"{RELEASE_FILE}/{TAG}/{TAG}.tar.ac",
    ]
