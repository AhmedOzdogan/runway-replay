# Roadmap

Want to help with one of these? Comment on its issue first, see [CONTRIBUTING.md](CONTRIBUTING.md).

## V1: the replay
- [x] Pipeline for one airport-day (stream dump → filter → split into flights → resample → `json.gz`)
- [x] Replay with neon trails on a dark map (deck.gl TripsLayer)
- [x] Controls: play/pause, time slider, ±1 minute, speed 1x–16x, clock, keyboard shortcuts
- [x] Airport picker (Munich, Istanbul, Hanoi)
- [x] Click an aircraft for its info card (type, registration, altitude, speed, status)
- [x] Follow the selected plane with the camera
- [x] Parked planes at the gates between flights
- [x] Estimated landings and takeoffs where the receivers lose the aircraft
- [x] Airport ground vehicles (ADS-B category C1/C2) shown as orange trucks
- [x] CI: lint and tests for Python and TypeScript on every PR and push to `main`
- [x] Daily GitHub Action that processes yesterday's data into the `data` branch
- [x] "Follow your flight": search by callsign
- [x] Deploy to GitHub Pages

## V2: make it a game
- [x] "GO AROUND!" moments: detect aborted landings, show a banner
- [x] Simulated ATC radio conversation in the flight card (arrivals, departures, go-arounds)
- [x] Optional HD radio voice (Kokoro, in the browser) through an aircraft-radio filter
- [ ] Airline colours in the search results and the flight card: one accent per ICAO airline code
      (a dot or a left border), drawn by us from the airline's livery. Deliberately not logos:
      naming an airline is referential use and fine, but shipping its logo file copies artwork we
      can't relicense under MIT (see the Skiplagged verdict, where the damages were the copyright
      claim on the logo, not the trademark one). If images ever happen, only logos with an explicit
      free licence, each one recorded with its source
- [ ] HD radio voice on phones: generating a line takes 6–11 s there against a 9 s gap, so the
      voice is desktop-only today. The one idea left is cross-origin isolation (COOP/COEP through a
      service worker) for multi-threaded inference; WebGPU is ruled out, see docs/radio-voice.md
- [ ] Radio for overflights and ground movements
- [ ] Zoom the camera in on a go-around
- [ ] Spotter badges: A380, 747, military, private jets
- [ ] Guess the destination: pick one of 4 cities when a plane takes off, keep score (needs route data)
- [ ] Holding pattern loops highlighted in neon
- [ ] Real origin/destination on the flight card (route database)

## V3: share it
- [ ] Export a 60-second timelapse (video/GIF)
- [ ] Date picker and more airports (keep the last N days on the `data` branch, with an index of dates)
- [ ] Local time per airport (the clock is UTC today)
