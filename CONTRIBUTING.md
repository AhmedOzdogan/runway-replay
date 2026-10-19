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

The site loads `web/public/data/sample.json` during development, so you don't need to process
a real day to work on the frontend. Formats: [docs/data-format.md](docs/data-format.md).

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
