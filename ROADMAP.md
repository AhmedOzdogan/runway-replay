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
- [ ] "Follow your flight": search by callsign
- [ ] Deploy to GitHub Pages

## V2: make it a game
- [x] "GO AROUND!" moments: detect aborted landings, show a banner
- [x] Simulated ATC radio conversation in the flight card (arrivals, departures, go-arounds)
- [x] Optional HD radio voice (Kokoro, in the browser) through an aircraft-radio filter
- [ ] Radio for overflights and ground movements
- [ ] Zoom the camera in on a go-around
- [ ] Spotter badges: A380, 747, military, private jets
- [ ] Guess the destination: pick one of 4 cities when a plane takes off, keep score (needs route data)
- [ ] Holding pattern loops highlighted in neon
- [ ] Real origin/destination on the flight card (route database)

## V3: share it
- [ ] Export a 60-second timelapse (video/GIF)
- [ ] Date picker and more airports
- [ ] Daily GitHub Action that processes yesterday's data
- [ ] Local time per airport (the clock is UTC today)
