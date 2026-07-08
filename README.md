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
- `monograph/`: thesis written in LaTeX
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
npm run dev
```

Default app: `http://localhost:5173`

Vite already proxies `/api` to `http://localhost:5000`.

#### Desktop

The project can also be packaged as a standalone installer for macOS, Windows, and Linux using the `desktop/` folder.

```bash
cd desktop
npm install
npm run dist
```

This generates:

- macOS: `.dmg`
- Windows: `nsis` installer
- Linux: `.AppImage`

Desktop packaging reuses the compiled frontend and the Python backend frozen as a local executable.
Build scripts automatically resolve Python, preferring the project `.venv` and falling back to `python3` or `python` when needed.

## Tests

### Frontend

Run the unit test suite:

```bash
cd frontend
npm test
```

Build the frontend before publishing or validating production output:

```bash
cd frontend
npm run build
```

Run the local preview used by Playwright:

```bash
cd frontend
npm run preview -- --host 127.0.0.1
```

Run the end-to-end tests:

```bash
cd frontend
npm run test:e2e
```

Run only the Chromium project configured in Playwright:

```bash
cd frontend
npm run test:e2e -- --project=chromium
```

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
cd monograph
./compile.sh
```

Generated PDF: `monograph/TEX/main.pdf`.

## Deployment

The frontend is built with Vite in `deploy/Dockerfile.frontend` and served through Nginx. The main Swarm deployment script is:

```bash
./deploy/deploy.sh
```

Published application: [tcc.joao.baza.dev.br](https://tcc.joao.baza.dev.br)

## CI/CD

- `ci.yml` runs backend tests, frontend unit tests, frontend Playwright checks, and desktop smoke validation.
- `docker-publish.yml` publishes the API and frontend images to GHCR on `main` and release tags.
- `desktop-publish.yml` builds desktop installers on release tags and uploads them as workflow artifacts, with release assets attached for tagged releases.

## Desktop Packaging

The installer build flow is:

```bash
cd frontend
npm run build

cd ../desktop
npm run dist
```

The desktop backend exposes `GET /health` so the host can validate startup before opening the main window.

## Notes

- The current working branch should not revert unrelated changes already present in the workspace.
