# SkyReplay

Replay one airport's full day of real flights at 50x speed: neon trails on a dark map.

![SkyReplay demo](docs/demo.gif) <!-- TODO: record a GIF -->

**Live demo:** https://ahmedozdogan.github.io/skyreplay/ (not deployed yet)

> Status: early skeleton. See [ROADMAP.md](ROADMAP.md) and the open issues.

## How it works

```
adsb.lol daily dump  ──►  pipeline/process.py  ──►  MUC-2026-10-18.json.gz  ──►  browser
 (~3.5 GB, worldwide,       stream, keep planes        (a few MB, static file)      MapLibre + deck.gl
  streamed, never saved)    near the airport,                                        replay
                            resample to 5 s
```

There's no backend: the pipeline runs once per airport-day and the site is plain static files.
File formats are documented in [docs/data-format.md](docs/data-format.md).

## Quick start

Process a day (Python 3.11+):

```sh
cd pipeline
python -m venv .venv && source .venv/bin/activate
pip install -e '.[dev]'
python process.py --airport MUC IST HAN --date 2026-10-18
pytest
```

Run the site (Node 24, see `web/.nvmrc`):

```sh
cd web
npm install
npm run dev
```

## Data and license

Data: [adsb.lol](https://adsb.lol) (ODbL). Flight data comes from adsb.lol under the
[Open Database License](https://opendatacommons.org/licenses/odbl/1-0/). Published data
files (`*.json.gz`) are derived databases and stay under ODbL.

The code is [MIT](LICENSE).
