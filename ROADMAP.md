# Roadmap

## V1: the replay
- [ ] Pipeline for one airport-day (stream dump → filter → resample → `json.gz`)
- [ ] Replay with neon trails on a dark map (deck.gl TripsLayer)
- [ ] Controls: play/pause, time slider, speed 1x–200x, clock
- [ ] "Follow your flight": search by callsign, camera follows it
- [ ] Click an aircraft for its info card (type, registration, altitude, speed)

## V2: make it a game
- [ ] Spotter badges: A380, 747, military, private jets
- [ ] Guess the destination: pick one of 4 cities when a plane takes off, keep score
- [ ] "GO AROUND!" moments: detect aborted landings, zoom in, show a banner
- [ ] Holding pattern loops highlighted in neon

## V3: share it
- [ ] Sounds (off by default): whoosh on takeoff, ding on landing
- [ ] Export a 60-second timelapse (video/GIF)
- [ ] Airport picker
- [ ] Daily GitHub Action that processes yesterday's data
