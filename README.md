# DCOU

Software educacional para dimensionamento computacional de operações unitárias em Engenharia Química, desenvolvido como TCC na UFMS. A aplicação combina uma API em `FastAPI` com um frontend `Vite + React + TypeScript`.

## Stack atual

- `backend`: `Python`, `FastAPI`, `Pydantic`, `CoolProp`, `Pint`, `NumPy`, `SciPy`, `Matplotlib`
- `frontend`: `Vite`, `React`, `TypeScript`, `React Router`, `Tailwind CSS`, `shadcn/ui`, `KaTeX`, `Recharts`, `Sonner`
- `testes`: `Pytest`, `Vitest`, `React Testing Library`, `Playwright`
- `deploy`: `Docker`, `Docker Swarm`, `Nginx`, `Traefik`

## Estrutura

- `routers/`, `models/`, `schemas/`: API e lógica de cálculo
- `frontend/`: SPA React
- `deploy/`: Dockerfiles, compose e scripts de deploy
- `escrita/`: monografia em LaTeX
- `demo/tests/`: testes Python de integração e demonstração

## Execução local

### Backend

```bash
python main.py
```

API padrão: `http://localhost:5000`

O backend também responde ao healthcheck em `http://localhost:5000/health` e aceita `DCOU_HOST`/`DCOU_PORT` quando precisa subir em um endereço diferente.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App padrão: `http://localhost:5173`

O `Vite` já faz proxy de `/api` para `http://localhost:5000`.

### Desktop

O projeto também pode ser empacotado como instalador autossuficiente para macOS, Windows e Linux usando a pasta `desktop/`.

```bash
cd desktop
npm install
npm run dist
```

Isso gera:

- macOS: `.dmg`
- Windows: instalador `nsis`
- Linux: `.AppImage`

O empacotamento desktop reaproveita o frontend compilado e o backend Python congelado como executável local.

## Testes

### Frontend

```bash
cd frontend
npm test
npm run build
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

## Monografia

```bash
cd escrita
./compile.sh
```

PDF gerado em `escrita/TEX/main.pdf`.

## Deploy

O frontend é compilado com `Vite` no `deploy/Dockerfile.frontend` e servido via `Nginx`. O script principal de publicação em swarm é:

```bash
./deploy/deploy.sh
```

Aplicação publicada: [tcc.homelab.sistemasj.com.br](https://tcc.homelab.sistemasj.com.br)

## Empacotamento Desktop

O fluxo de build do instalador é:

```bash
cd frontend
npm run build

cd ../desktop
python -m pip install -r requirements-build.txt
python scripts/build-backend.py
npx electron-builder --config electron-builder.yml
```

O backend desktop expõe `GET /health` para o host local validar a inicialização antes de abrir a janela principal.

## Observações

- O branch de trabalho atual não deve reverter alterações não relacionadas já existentes no workspace.
