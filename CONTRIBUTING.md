# Contributing

Thanks for helping! **Comment on an issue before starting a feature**, so nobody duplicates work
and we can agree on the approach first. Small fixes can go straight to a PR.

## Setup

Pipeline (Python 3.11+):

```sh
cd pipeline
python -m venv .venv && source .venv/bin/activate
pip install -e '.[dev]'
```

Web (Node 24, see `web/.nvmrc`):

```sh
cd web
npm install
npm run dev
```

Until you process a real day, Munich shows a few fake flights from `web/public/data/sample.json`,
so you can work on the frontend without the ~3.5 GB download. Formats: [docs/data-format.md](docs/data-format.md).

To process a real day (streams ~3.5 GB once, writes one file per airport):

```sh
cd pipeline && python process.py --airport MUC IST HAN --date 2026-10-18
```

On macOS with the python.org installer, if you get `CERTIFICATE_VERIFY_FAILED`, run
`/Applications/Python\ 3.*/Install\ Certificates.command` once.

## Project structure

```
pipeline/                 Python: adsb.lol daily dump -> one .json.gz per airport-day
  process.py              CLI entry point
  download.py             stream the dump (never saved to disk)
  filter.py, resample.py  keep points near the airport, split into flights, thin to 5 s
web/src/
  main.tsx                React entry point: renders <App /> into index.html's #root
  App.tsx                 page layout and app state (airport, selected plane, follow)
  components/             UI: Header, Footer, AirportPicker, TimeBar, FlightCard, GoAroundBanner, ToggleButton
  map/                    ReplayMap (MapLibre via react-map-gl), DeckOverlay, deck.gl layers
  hooks/                  usePlayback (clock + keyboard), useFlights (loading), useGoAroundAlert
  flights/                pure flight logic: positions, parking, estimates, go-arounds, status text, radio
  data/                   airport list, airline/aircraft names, loading the .json.gz files
  types/                  data types (Flight, Point, Plane, Airport)
  utils/                  small helpers (formatting, distance)
  style.css               Tailwind import + theme tokens (colours, glow, animation)
web/tests/unit/           Vitest unit tests, mirroring src/ (e.g. flights/radio.test.ts tests src/flights/radio.ts)
  helpers.ts              shared test helpers (a test airport, flightThrough)
```

## Tests and lint

```sh
cd pipeline && ruff check . && ruff format --check . && pytest
cd web && npm run lint && npm test && npm run build   # Biome, Vitest, then type-check + build
```

Auto-fix: `ruff check --fix . && ruff format .` and `npm run format`. VS Code users: install the
recommended extensions (`.vscode/extensions.json`) to lint and format on save.

## Branches and PRs

- Branch from `main`: `feat/<short-name>`, `fix/<short-name>`, `docs/<short-name>`.
- One focused change per PR; link the issue (`Closes #12`).
- Add screenshots or a GIF for visual changes.
- Don't commit processed `*.json.gz` data files.
- By contributing you agree that your code is MIT-licensed.

Please follow our [Code of Conduct](CODE_OF_CONDUCT.md).
