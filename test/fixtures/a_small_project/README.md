# a-small-project

A manifest goes in, consignments come out, and each one is dispatched by a gate.

## Run it

```bash
uv sync --all-groups            # a bare `uv sync` drops the dev group
./scripts/gate                  # the suite, lint, types — the one command
uv run pytest -q                # the suite alone
```

## Configuration

A deployment states these. **Every one is refused rather than defaulted** when it holds
something this system cannot read.

| Setting | What it states | What it is not |
|---|---|---|
| `FIXTURE_CREATIVE_MODE` | `on` makes a manifest brief itself first. Any other value is refused by name | a list of things to do |
| `FIXTURE_PROJECTS_DIR` | where runs are written. **Required and never defaulted** | a cache, a temp directory |
