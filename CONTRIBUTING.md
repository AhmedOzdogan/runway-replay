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

## Tests and lint

```sh
cd pipeline && ruff check . && ruff format --check . && pytest
cd web && npm run lint && npm run build   # Biome, then type-check + build
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
