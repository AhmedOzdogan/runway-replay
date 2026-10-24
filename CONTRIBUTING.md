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
cd pipeline && python process.py --airport MUC LHR AMS --date 2026-10-18
```

On macOS with the python.org installer, if you get `CERTIFICATE_VERIFY_FAILED`, run
`/Applications/Python\ 3.*/Install\ Certificates.command` once.

## Project structure

```
pipeline/                 Python: adsb.lol daily dump -> one .json.gz per airport-day
  process.py              CLI entry point
  download.py             stream the dump (never saved to disk)
  filter.py, resample.py  keep points near the airport (with callsign and ADS-B category),
                          split into flights, thin to 5 s
web/src/
  main.tsx                React entry point: renders <App /> into index.html's #root
  App.tsx                 page layout and app state (airport, selected plane, follow)
  components/             UI: Header, Footer, AirportPicker, TimeBar, FlightCard, RadioTranscript,
                          GoAroundBanner, ToggleButton
  map/                    ReplayMap (MapLibre via react-map-gl), DeckOverlay, deck.gl layers
  hooks/                  usePlayback (clock + keyboard), useFlights (loading), useGoAroundAlert,
                          useRadioVoice (speaks radio lines with the HD voice)
  flights/                pure flight logic: positions, parking, estimates, go-arounds, ground vehicles,
                          status text, radio (radio.ts: written/spoken forms, radioScript.ts: conversations)
  sound/                  HD radio voice: Kokoro in a Web Worker (kokoro.worker.ts, kokoroClient.ts),
                          the radio audio effect (radioEffect.ts), and its pure logic (radioVoicePlan.ts)
  data/                   airport list, airline/aircraft/radio names, radio phrases, loading the .json.gz files
  types/                  data types (Flight, Point, Plane, Airport)
  utils/                  small helpers (formatting, distance, a serial task queue)
  assets/                 the header logo in 1x/2x/3x
  style.css               Tailwind import + theme tokens (colours, glow, animation)
web/tests/unit/           Vitest unit tests, mirroring src/ (flights/, sound/, utils/; e.g.
                          flights/radio.test.ts tests src/flights/radio.ts)
  helpers.ts              shared test helpers (a test airport, flightThrough)
```

## Radio messages

The radio conversation is simulated, but it's built on real flights, so two rules apply when you
add or change phrases in `web/src/data/radioPhrases.ts`:

- **Only use the five real details:** `{callsign}`, `{airport}`, `{runway}`, `{altitude}`,
  `{heading}`. No invented winds, frequencies, sequence numbers or reasons ("unstable approach").
- **No emergencies** (mayday, pan-pan, squawk 7700…): they would tell a false story about a real
  airline and crew.

Every pilot readback must repeat the instruction it answers, and every line must contain
`{callsign}`; the tests in `tests/unit/flights/radioScript.test.ts` check all variants.

## Tests and lint

CI (`.github/workflows/ci.yml`) runs these on every pull request and on pushes to `main` and `develop`:

```sh
cd pipeline && ruff check . && ruff format --check . && pytest
cd web && npm run lint && npm test && npm run build   # Biome, Vitest, then type-check + build
```

Auto-fix: `ruff check --fix . && ruff format .` and `npm run format`. VS Code users: install the
recommended extensions (`.vscode/extensions.json`) to lint and format on save.

## Branches and PRs

- Branch from `develop`: `feat/<short-name>`, `fix/<short-name>`, `docs/<short-name>`.
- Open the PR against `develop`. `main` is production: it only receives `develop`, by pull request,
  and deploys to the live site once CI is green.
- Both branches are protected, so nothing is pushed to them directly.
- One focused change per PR; link the issue (`Closes #12`).
- Add screenshots or a GIF for visual changes.
- Don't commit processed `*.json.gz` data files: the daily workflow publishes them to the `data` branch.
- By contributing you agree that your code is MIT-licensed.

Please follow our [Code of Conduct](CODE_OF_CONDUCT.md).
