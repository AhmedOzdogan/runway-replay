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


def test_asks_github_with_a_token_when_there_is_one(monkeypatch):
    """Unauthenticated the API allows 60 requests an hour per IP, which CI runners share."""
    monkeypatch.setenv("GITHUB_TOKEN", "secret")
    seen = {}

    def fake_urlopen(request, **_):
        seen["authorization"] = request.get_header("Authorization")
        return fake_release([f"{TAG}.tar.aa"])

    monkeypatch.setattr(download.urllib.request, "urlopen", fake_urlopen)
    download.dump_urls("2026-10-20")
    assert seen["authorization"] == "Bearer secret"


def test_asks_without_a_token_on_a_laptop(monkeypatch):
    monkeypatch.delenv("GITHUB_TOKEN", raising=False)
    monkeypatch.delenv("GH_TOKEN", raising=False)
    seen = {}

    def fake_urlopen(request, **_):
        seen["authorization"] = request.get_header("Authorization")
        return fake_release([f"{TAG}.tar.aa"])

    monkeypatch.setattr(download.urllib.request, "urlopen", fake_urlopen)
    download.dump_urls("2026-10-20")
    assert seen["authorization"] is None
