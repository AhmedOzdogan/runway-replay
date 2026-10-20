# Data format

## Input: adsb.lol daily dumps

Releases: https://github.com/adsblol/globe_history_2026/releases

- Tags look like `v2026.10.18-planes-readsb-prod-0`. Each is a split tar, `.tar.aa` + `.tar.ab`
  (~3.5 GB total, worldwide). Concatenate the parts and read them as one stream.
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
`squawk`, `emergency` and `category`. One file covers the aircraft's whole day (often several
flights), about 3.6 s between points.

Don't use the live API (`api.adsb.lol`) in V1: it's rate-limited (4/s, 60/min, 500/day) and
sends no CORS headers, so a browser can't call it.

## Output: one file per airport-day

`web/public/data/<AIRPORT>-<YYYY-MM-DD>.json.gz` (TypeScript types: `web/src/types.ts`,
example: `web/public/data/sample.json`).

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
- Ground speed isn't stored; derive it from consecutive points if needed.
