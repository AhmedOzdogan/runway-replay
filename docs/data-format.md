# Data format

## Input: adsb.lol daily dumps

Releases: https://github.com/adsblol/globe_history_2026/releases

- Tags look like `v2026.10.18-planes-readsb-prod-0`. Each is one tar split into ~2 GB parts
  (`.tar.aa`, `.tar.ab`, ...; ~3.5 GB total, worldwide). The number of parts grows over time, so
  read it from the release's asset list instead of assuming. Concatenate them into one stream.
- The tar starts with `heatmap/` files; the `traces/` come later (for 2026-10-18 they begin
  somewhere between 500 MB and 1 GB into `.tar.aa`).
- Read it with `tarfile` in streaming mode (`mode="r|"`). Never save the dump to disk: members are
  read in memory with `extractfile()`, so nothing is extracted (and no extraction filter applies).
- Each trace is `./traces/<xx>/trace_full_<icao>.json` (note the `./` prefix), gzipped JSON.

Top-level keys:

| key | meaning |
|---|---|
| `icao` | 24-bit hex address, e.g. `3c6444` |
| `r` | registration, e.g. `D-AIBD` |
| `t` | type code, e.g. `A320` |
| `desc` | type description |
| `dbFlags` | bit flags (military, etc.) |
| `timestamp` | Unix time of the start of the day |
| `trace` | list of points |

Each point:

```
[sec_offset, lat, lon, alt_ft | "ground", ground_speed_kt, track_deg,
 flags, vert_rate_fpm, details | null, source, ...]
```

`details` appears only on some points and holds `flight` (callsign, with trailing spaces),
`squawk`, `emergency` and `category` (the ADS-B emitter category, see the output section).
One file covers the aircraft's whole day (often several flights), about 3.6 s between points.

Don't use the live API (`api.adsb.lol`) in V1: it's rate-limited (4/s, 60/min, 500/day) and
sends no CORS headers, so a browser can't call it.

## Output: one file per airport-day

`web/public/data/<AIRPORT>-<YYYY-MM-DD>.json.gz` (TypeScript types: `web/src/types/flight.ts`,
example: `web/public/data/sample.json`). The pipeline also writes `web/public/data/latest.json`,
`{"date": "2026-10-18"}`, which tells the app which day to load.

Published days accumulate on the `data` branch, alongside an `index.json` written by
`pipeline/write_index.py`:

```json
{ "days": [{ "date": "2026-10-21", "airports": ["AMS", "LHR", "MUC"] }, ...] }
```

The deployed site contains only the newest day. The branch is public and sends CORS headers
through `raw.githubusercontent.com`, so older days can be fetched from there directly.

```json
{
  "airport": "MUC",
  "date": "2026-10-18",
  "dayStart": 1792281600,
  "flights": [
    {
      "icao": "3c6444",
      "registration": "D-AIBD",
      "type": "A319",
      "callsign": "DLH4AB",
      "category": "A3",
      "origin": null,
      "destination": { "icao": "EDDH", "city": "Hamburg" },
      "points": [[28800, 11.45, 48.30, 6000], ...]
    }
  ]
}
```

- A **flight** is one continuous visit of an aircraft to the airport zone: an arrival, a
  departure or an overflight. An aircraft's day is split into flights wherever its points in the
  zone are more than 5 minutes apart, so one aircraft can appear several times.
- `points` are `[sec_offset, lon, lat, alt_ft]`. Note lon before lat (deck.gl order), and
  altitude `0` for `"ground"`.
- `sec_offset` is seconds since `dayStart` (00:00 UTC). deck.gl's TripsLayer stores timestamps
  as float32, so never use full Unix time there.
- Zone: within 50 km of the airport and below 15,000 ft. Parked aircraft (on the ground, under
  3 kt) are dropped; taxiing ones are kept.
- Resampled to at most one point per 5 s; coordinates rounded to 4 decimals (≈ 11 m), altitude
  to whole feet.
- `callsign` is the latest callsign seen for that flight (trimmed), or `null`.
- `category` is the latest ADS-B emitter category seen for that flight, or `null` (many
  transmitters never send one). `A1`–`A7` are aircraft, from light (`A1`) to heavy (`A5`) and
  rotorcraft (`A7`); `C1` is a ground emergency vehicle and `C2` a ground service vehicle, e.g. the
  `ELEKT…` vehicles that drive Munich's runways at night.
- `origin` and `destination` are `{"icao", "city"}` or `null`: where the aircraft last came
  down before this flight, and where it next came down after it. See "Where a flight went" below.
- A `destination` also carries `at`, the second of the day it came down there, so the app can say
  how long the flight took (`at` minus the flight's last point). An `origin` has no equivalent:
  the day's data says when an aircraft last *landed* at its origin, not when it left again.
- Ground speed isn't stored; derive it from consecutive points if needed.

## Which flights belong to this airport

A 50 km zone catches the neighbours too. Measured on 2026-10-22, by attributing each flight to the
airport nearest its lowest point:

| airport | flights in zone | this airport | a neighbour | overflights |
|---|---|---|---|---|
| Munich | 1,755 | 1,532 | 153 | 70 |
| Heathrow | 5,620 | 2,061 | **3,371** | 188 |
| Amsterdam | 3,248 | 3,053 | 167 | 28 |

Heathrow's zone is 60% other airports' traffic — Gatwick 1,542 flights, Luton 551, City 295,
Northolt 246, Farnborough 194. Without filtering, the app would show those as Heathrow flights and
the simulated ATC would clear them to land on a runway they are nowhere near. Dropping them also
cuts 46% of Heathrow's file.

So `process.py` keeps a flight only when the airport nearest its lowest point is this airport, or
when there is no airport within 20 km at all — that last case is a genuine overflight, which is
this airport's traffic passing by rather than a neighbour's.

## Where a flight went

ADS-B carries no route: an aircraft broadcasts where it is, not where it is going. But one dump
holds every aircraft's whole day worldwide, so a departure can be followed to wherever it next
comes down, and an arrival back to where it last came down.

Most airports have no surface coverage (Istanbul had **one** ground point in a whole day), so
"landed" cannot mean "seen standing on the ground". It means the trace ends, or pauses for 15
minutes or more, while the aircraft is below 4,000 ft — matched to an airport within 20 km. A
touchdown less than 20 minutes after takeoff and within 50 km is a climb-out coverage gap, not an
arrival, and is ignored.

Measured on 2026-10-22: Munich resolved 87% of its departures, Amsterdam 85%, Heathrow 78%. The
rest land after midnight UTC, or come down where no receiver sees them — hence `null`, which the
app has to handle.

A landing is timed from the **start** of that low run, when the aircraft came down through
4,000 ft. Timing it from the end would be wrong: with ground coverage an aircraft keeps
transmitting at its stand for hours, which once made a 50-minute hop to Frankfurt look like seven.

Even so, a first landing can be invisible — no gap, no long stand, nobody watching — and the one
we find is a later leg. So `at` is only written when the flight time **fits the distance**
(`routes.looks_plausible`: within twice `distance / 800 km/h + 45 min`). Around 95% of resolved
destinations keep their time; the rest show nothing rather than something wrong.

The airport list is `pipeline/airports_reference.csv`: the large and medium airports from
[OurAirports](https://ourairports.com/data/) (public domain), trimmed to `icao,city,lat,lon`.
Regenerate it by downloading `airports.csv` from there and keeping those columns and types.
