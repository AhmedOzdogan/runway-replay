# Data format

## Input: adsb.lol daily dumps

Releases: https://github.com/adsblol/globe_history_2026/releases

- Tags look like `v2026.10.18-planes-readsb-prod-0`. Each is a split tar, `.tar.aa` + `.tar.ab`
  (~3.5 GB total, worldwide). Concatenate the parts and read them as one stream.
- The tar starts with `heatmap/` files; the `traces/` come later (for 2026-10-18 they begin
  somewhere between 500 MB and 1 GB into `.tar.aa`).
- Read it with `tarfile` in streaming mode (`mode="r|"`) and `filter="data"`. Never save the dump to disk.
- Each trace is `traces/<xx>/trace_full_<icao>.json`, gzipped JSON.

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
  "airport": "FRA",
  "date": "2026-10-18",
  "dayStart": 1792281600,
  "aircraft": [
    {
      "icao": "3c6444",
      "registration": "D-AIBD",
      "type": "A319",
      "callsigns": ["DLH4AB"],
      "points": [[28800, 8.30, 49.93, 6000], ...]
    }
  ]
}
```

- `points` are `[sec_offset, lon, lat, alt_ft]`. Note lon before lat (deck.gl order), and
  altitude `0` for `"ground"`.
- `sec_offset` is seconds since `dayStart`. deck.gl's TripsLayer stores timestamps as float32,
  so never use full Unix time there.
- Filtering: within ~50 km of the airport and below ~15,000 ft.
- Size target is a few MB: resample to ~5 s steps and round coordinates (4 decimals ≈ 11 m).
- `callsigns` are trimmed and de-duplicated, in order of first appearance.
- Ground speed isn't stored; derive it from consecutive points, or add it as a 5th element if needed.
