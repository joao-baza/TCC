# Educational Simulator for Unit Operations

Final project in Chemical Engineering at the Federal University of Mato Grosso do Sul (UFMS), developed by João Pedro Baza Garcia Rodrigues [[LinkedIn]](https://www.linkedin.com/in/joao-baza/) under the supervision of Prof. Celso Murilo dos Santos [[LinkedIn]](https://www.linkedin.com/in/celso-murilo-dos-santos/). The project can be tested online [here](https://tcc.joao.baza.dev.br). Last update: 2026-07-08.

## Academic Context

This final project proposes a free web-based software for the simulation and sizing of unit operations.

### Motivation

The goal is to democratize the calculation tools used in chemical engineering projects, reducing dependence on expensive proprietary software such as Aspen Plus, HYSYS, and ChemCAD.

## Introduction, Justification, and Objectives

### Introduction

Sizing chemical process equipment requires mastery of mass and energy balances, thermodynamics, heat and mass transfer, and chemical kinetics. This system integrates these concepts into an accessible application.

### Justification

Institutions without commercial licenses often lack didactic platforms for this type of study. An open solution supports active learning, real-time visualization of results, and interdisciplinary collaboration.

### General Objective

To offer a modular web application for calculating and sizing unit operations using a client-server architecture and an open API.

### Specific Objectives

1. Implement classical sizing routines for heat exchangers, columns, absorption, evaporation, reactors, and piping.
2. Develop a responsive and user-friendly web interface.
3. Integrate a local physicochemical property database, initially hardcoded, together with scientific libraries.
4. Validate results against literature and commercial tools to ensure reliability.

## Didactic Purpose

- Support case studies that connect theory, such as balances, kinetics, and flow, with modern computational implementation.
- Encourage open contributions to expand property catalogs, add new process modules, and enable comparative studies with proprietary software by researchers in chemical engineering and software.

## Roadmap

- CAPE-OPEN integration.
- Removal of hardcoded values:
  1. Maximum conversion value using the Brent method.
  2. Characteristics, properties, and schedules of piping.
  3. Input type changes in the reactor to accept mass, molar, or volumetric concentration.
  4. Addition of new unit operations over time, such as multiphase and heterogeneous reactors, heat exchangers, evaporators, and others.

---

Contributions and feedback are welcome!

## Current Project Information

### Stack

- `backend`: `Python`, `FastAPI`, `Pydantic`, `CoolProp`, `Pint`, `NumPy`, `SciPy`, `Matplotlib`
- `frontend`: `Vite`, `React`, `TypeScript`, `React Router`, `Tailwind CSS`, `shadcn/ui`, `KaTeX`, `Recharts`, `Sonner`
- `tests`: `Pytest`, `Vitest`, `React Testing Library`, `Playwright`
- `deploy`: `Docker`, `Docker Swarm`, `Nginx`, `Traefik`

### Structure

- `routers/`, `models/`, `schemas/`: API and calculation logic
- `frontend/`: React SPA
- `deploy/`: Dockerfiles, compose files, and deployment scripts
- `final-paper/`: thesis written in LaTeX
- `demo/tests/`: Python integration and demonstration tests

### Local Development

#### Backend

```bash
python main.py
```

Default API starts at `http://localhost:5000` and falls back to the next free port if `5000` is occupied.

The backend health check is exposed at `/health` on the selected port, and it still accepts `DCOU_HOST` / `DCOU_PORT` when it needs to run on a different address.

#### Frontend

```bash
cd frontend
npm install
VITE_PID_ADAPTER=local npm run dev
```

Default app: `http://localhost:5173`

Vite already proxies `/api` to `http://localhost:5000`.

> **Development only:** `VITE_PID_ADAPTER=local` stores P&ID documents and
> capability tokens in the browser. It is not the production PostgreSQL/Redis
> adapter and must not be used as a silent production fallback.

#### Desktop

The project can also be packaged as a standalone installer for macOS, Windows, and Linux using the `desktop/` folder.

```bash
cd desktop
npm install
npm run dist:local
```

On Linux, this generates:

- Windows: `nsis` installer
- Linux: `.AppImage`

The macOS `.dmg` is built on macOS runners via `npm run dist`.

Desktop packaging reuses the compiled frontend and the Python backend frozen as a local executable.
Build scripts automatically resolve Python, preferring the project `.venv` and falling back to `python3` or `python` when needed.

#### P&ID Editor and Foundation

The current P&ID delivery includes a visual editor for equipment, ports,
connections, annotations, grouping, local collaboration state, and SVG/PNG
export. The backend foundation also defines persistent diagrams, capability
tokens, snapshots, one-time tickets, and versioned symbol catalogs. The editor
does not yet exchange data with engineering calculations; stable UUIDs and API
contracts keep that later integration possible.

##### Run the foundation locally

Create the local configuration file:

```bash
cp .env.example .env
```

Set `POSTGRES_NODE_HOSTNAME` to the Swarm node that owns the local PostgreSQL
volume. List the available hostnames with `docker node ls`. The deployment
validates this value before changing the stack and pins PostgreSQL to that node,
so an unavailable data node leaves the service pending instead of starting with
an empty volume elsewhere.

Generate a pepper, then replace the `PID_TOKEN_PEPPER` placeholder in `.env`
with the generated value. Do not commit the resulting file or print a real
pepper in logs or documentation.

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Start the isolated test dependencies:

```bash
docker compose -f deploy/docker-compose.test.yaml up -d --wait
```

The test Compose file exposes PostgreSQL and Redis only on localhost. Export
its URLs, migrate the test database, and run the backend suite:

```bash
export DATABASE_URL='postgresql+psycopg://dcou:dcou_test@127.0.0.1:55432/dcou_test'
export REDIS_URL='redis://127.0.0.1:56379/0'
export PID_TEST_DATABASE_URL="$DATABASE_URL"
export PID_TEST_REDIS_URL="$REDIS_URL"
alembic upgrade head
pytest -q
```

The hostnames in `.env.example`, such as `tcc-postgres` and `tcc-redis`, are
service names for the production Swarm network. They are not substitutes for
the localhost URLs above.

Validate both draft catalog manifests independently:

```bash
python -m pid.catalog.validator \
  pid/catalog/manifests/isa/foundation.json \
  pid/catalog/manifests/iso/foundation.json
```

##### Configuration and operations reference

- The `GET` `/health` endpoint is a dependency-free liveness check. It confirms that the API
  process is running even when P&ID is disabled.
- The `GET` `/ready` endpoint is the P&ID readiness check. When P&ID is enabled,
  it reports an unavailable state until PostgreSQL and Redis respond.
- Production PostgreSQL data is durable in the named
  `tcc_postgres_data` volume on the node selected by
  `POSTGRES_NODE_HOSTNAME`. This is node-local durability, not high
  availability. Redis is intentionally ephemeral, with AOF and RDB persistence
  disabled. This open-source MVP foundation does not configure external
  backups.
- `deploy/deploy.sh` sources `.env` with Bash. Wrap values containing shell
  special characters in single quotes. Passwords embedded in `DATABASE_URL`
  and `REDIS_URL` must be percent-encoded, and the encoded URL credentials must
  remain consistent with the corresponding plain password variables. Never
  place a real secret in committed examples.
- Four sanitized SVG symbols created for this project are redistributed from
  `frontend/public/pid/symbols/`. Their active catalog metadata, provenance, and
  license attribution are defined in
  `frontend/src/features/pid/catalog/fixtures/catalog.ts`. The external Draw.io
  and Wikimedia references in `pid/catalog/sources.json` record research inputs
  only; the empty ISA/ISO manifests under `pid/catalog/manifests/` remain drafts
  and do not claim that external assets are shipped.

This foundation has no link to calculations now; the persisted UUIDs and API
contracts are deliberately prepared for a future calculation integration.

## Tests

### Frontend

Run the unit test suite:

```bash
cd frontend
npm test
```

Run the isolated P&ID performance budget after the deterministic unit suite:

```bash
cd frontend
npm run benchmark:pid
```

The benchmark performs warmup runs and measures in one worker. Wall-clock
budgets live there so parallel unit-test load cannot make the default suite
flaky; unit tests still verify the 500-node/1,000-connection workload,
correctness, output cardinality, linear structural growth, and the result of a
100-command workload without depending on elapsed time.

Build the frontend for the current local P&ID stage:

```bash
cd frontend
npm run build:local
```

The local helper supplies `VITE_PID_ADAPTER=local` explicitly. Other build
entrypoints must do the same instead of relying on a production environment
file:

```bash
VITE_PID_ADAPTER=local npm run build
```

Production builds are fail-closed: if `VITE_PID_ADAPTER` is absent or has an
unsupported value, Vite stops with `Adaptador P&ID não configurado`.

Run the local preview used by Playwright:

```bash
cd frontend
VITE_PID_ADAPTER=local npm run preview -- --host 127.0.0.1
```

Run the end-to-end tests:

```bash
cd frontend
VITE_PID_ADAPTER=local npm run test:e2e
```

Run only the Chromium project configured in Playwright:

```bash
cd frontend
VITE_PID_ADAPTER=local npm run test:e2e -- --project=chromium
```

Preview and E2E commands pass the adapter explicitly for the same fail-closed
reason as builds: an absent or unsupported `VITE_PID_ADAPTER` stops Vite instead
of silently selecting browser storage.

### Backend

```bash
pytest
```

### Desktop

```bash
cd desktop
npm test
```

```bash
.venv/bin/pytest demo/tests/test_desktop_bootstrap.py -q
```

## Thesis

```bash
cd final-paper
./compile.sh
```

Generated PDF: `final-paper/TEX/main.pdf`.

## Deployment

The frontend is built with Vite in `deploy/Dockerfile.frontend` and served through Nginx. The main Swarm deployment script is:

```bash
./deploy/deploy.sh
```

Published application: [tcc.joao.baza.dev.br](https://tcc.joao.baza.dev.br)

## CI/CD

- `ci.yml` runs the ordered release pipeline: backend tests, frontend unit tests, frontend Playwright checks, frontend image publish, API image publish, desktop smoke validation, desktop package builds, and release publication on `main` and `v*` pushes.
- `docker-publish.yml` keeps manual and reusable GHCR image publishing paths without its own push trigger.
- `desktop-publish.yml` keeps a manual desktop package publishing path for exceptional runs and publishes a GitHub Release with the desktop binaries plus `sha256` checksums.

## Desktop Packaging

The installer build flow is:

```bash
cd frontend
npm run build:local

cd ../desktop
npm run dist:local
```

For published builds, the generated installers and checksums are attached to the GitHub Release created by either the CI publish job or the manual desktop publish workflow.

The desktop backend exposes `GET /health` so the host can validate startup before opening the main window.

## Notes

- The current working branch should not revert unrelated changes already present in the workspace.
