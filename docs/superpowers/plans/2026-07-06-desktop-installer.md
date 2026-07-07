# Desktop Installer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a self-contained desktop installer for macOS, Windows, and Linux that reuses the existing React/Vite frontend and FastAPI/Python backend without requiring Node, Python, or Docker on the user's machine.

**Architecture:** Add a thin Electron shell in a new `desktop/` workspace. The shell starts a packaged FastAPI executable, serves the compiled Vite frontend over a local HTTP server, and proxies `/api` to the backend so the browser-facing code stays almost unchanged. Package the backend separately with PyInstaller in `onedir` mode, then wrap the whole bundle with electron-builder per platform.

**Tech Stack:** Electron, Node.js 20, Express, http-proxy-middleware, PyInstaller, Python 3.10, FastAPI, Vite, React 19, TypeScript, Vitest, Playwright.

---

### Task 1: Create the desktop host and prove it serves the frontend and API proxy locally

**Files:**
- Create: `desktop/package.json`
- Create: `desktop/electron/host.cjs`
- Create: `desktop/electron/main.cjs`
- Create: `desktop/tests/host.test.mjs`
- Create: `desktop/.gitignore`

- [ ] **Step 1: Write the failing host test**

```js
import { mkdtempSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import { test, expect } from "vitest";
import { startDesktopHost } from "../electron/host.cjs";

async function startMockBackend() {
  const server = http.createServer((req, res) => {
    if (req.url === "/api/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    res.writeHead(404);
    res.end("not found");
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return { server, backendUrl: `http://127.0.0.1:${port}` };
}

test("serves the built frontend and proxies /api to the backend", async () => {
  const frontendDir = mkdtempSync(path.join(os.tmpdir(), "dcou-frontend-"));
  writeFileSync(path.join(frontendDir, "index.html"), "<div id=\"root\"></div>");

  const backend = await startMockBackend();
  const host = await startDesktopHost({
    frontendDir,
    backendUrl: backend.backendUrl,
  });

  expect(await fetch(`${host.url}/`).then((r) => r.text())).toContain("id=\"root\"");
  expect(await fetch(`${host.url}/api/health`).then((r) => r.json())).toEqual({ status: "ok" });

  await host.close();
  await new Promise((resolve) => backend.server.close(resolve));
});
```

- [ ] **Step 2: Run the test and confirm the host does not exist yet**

Run: `cd desktop && npm test -- tests/host.test.mjs`
Expected: FAIL because `desktop/electron/host.cjs` and the desktop package do not exist yet.

- [ ] **Step 3: Implement the local HTTP host and Electron bootstrap**

Use this shape as the target:

```js
// desktop/electron/host.cjs
async function startDesktopHost({ frontendDir, backendUrl, port = 0 }) {
  // serve / from frontendDir, fall back to index.html for SPA routes,
  // and proxy /api/* to backendUrl.
}

module.exports = { startDesktopHost };
```

`desktop/package.json` should declare `electron`, `express`, `http-proxy-middleware`, and `vitest` so the host can run, proxy, and test locally without reusing the frontend package.

```js
// desktop/electron/main.cjs
const { app, BrowserWindow } = require("electron");

async function createDesktopApp({ startDesktopHost, spawnBackend }) {
  // start backend, wait for /health, start host, open BrowserWindow,
  // and terminate the backend on app exit.
}

if (require.main === module) {
  // real bootstrap path.
}
```

The host must always use HTTP, not `file://`, so the existing frontend can keep calling `/api` with same-origin relative requests.

- [ ] **Step 4: Re-run the host test until it passes**

Run: `cd desktop && npm test -- tests/host.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit the desktop host slice**

```bash
git add desktop/package.json desktop/electron/host.cjs desktop/electron/main.cjs desktop/tests/host.test.mjs desktop/.gitignore
git commit -m "feat(desktop): add local host and proxy" -m "- Serve the compiled frontend from a local HTTP server\n- Proxy /api to the backend without changing browser-facing requests\n- Lock the host contract with a focused integration test"
```

---

### Task 2: Make the backend launchable as a standalone executable and health-checkable

**Files:**
- Modify: `app.py`
- Create: `desktop/requirements-build.txt`
- Create: `desktop/scripts/build-backend.py`
- Create: `demo/tests/test_desktop_bootstrap.py`

- [ ] **Step 1: Write the failing backend bootstrap test**

```python
from fastapi.testclient import TestClient

import app

def test_health_endpoint_reports_ok():
    client = TestClient(app.app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_runtime_config_reads_environment(monkeypatch):
    monkeypatch.setenv("DCOU_HOST", "127.0.0.1")
    monkeypatch.setenv("DCOU_PORT", "6123")

    host, port = app.get_runtime_config()

    assert host == "127.0.0.1"
    assert port == 6123
```

- [ ] **Step 2: Run the test and confirm the backend bootstrap helpers are missing**

Run: `pytest demo/tests/test_desktop_bootstrap.py -q`
Expected: FAIL because `get_runtime_config()` and `/health` do not exist yet.

- [ ] **Step 3: Implement the runtime helpers and frozen entrypoint behavior**

Use this shape as the target:

```python
def get_runtime_config() -> tuple[str, int]:
    host = os.getenv("DCOU_HOST", "127.0.0.1")
    port = int(os.getenv("DCOU_PORT", "5000"))
    return host, port


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    host, port = get_runtime_config()
    uvicorn.run("app:app", host=host, port=port, reload=False)
```

The backend entrypoint must not depend on a shell command. The desktop shell will launch the frozen executable directly and set `DCOU_HOST` and `DCOU_PORT`.

The build helper should freeze the backend in `onedir` mode:

```python
subprocess.run(
    [
        sys.executable,
        "-m",
        "PyInstaller",
        "--onedir",
        "--name",
        "dcou-backend",
        "--distpath",
        str(dist_dir),
        str(root / "app.py"),
],
    check=True,
)
```

The backend build environment should install `PyInstaller` from `desktop/requirements-build.txt` before running the build helper.

`desktop/requirements-build.txt` should contain only the build-time freezing tool:

```txt
pyinstaller==6.10.0
```

- [ ] **Step 4: Re-run the backend test until it passes**

Run: `pytest demo/tests/test_desktop_bootstrap.py -q`
Expected: PASS.

- [ ] **Step 5: Commit the backend packaging slice**

```bash
git add app.py desktop/requirements-build.txt desktop/scripts/build-backend.py demo/tests/test_desktop_bootstrap.py
git commit -m "feat(desktop): package the backend executable" -m "- Add a health endpoint and runtime config helper for the frozen app\n- Freeze the FastAPI backend with PyInstaller in onedir mode\n- Lock the bootstrap contract with backend tests"
```

---

### Task 3: Add installer packaging and platform-specific build wiring

**Files:**
- Create: `desktop/electron-builder.yml`
- Modify: `desktop/package.json`
- Create: `desktop/scripts/package-desktop.sh`
- Create: `desktop/assets/icon.png`
- Create: `desktop/tests/package-config.test.mjs`
- Create: `desktop/.npmrc` if the package needs reproducible installs

- [ ] **Step 1: Write the failing packaging-config test**

```js
import { readFileSync } from "node:fs";
import path from "node:path";
import { test, expect } from "vitest";
import yaml from "yaml";

test("desktop packaging includes the frontend bundle and backend executable", () => {
  const config = yaml.parse(
    readFileSync(path.resolve("electron-builder.yml"), "utf8"),
  );

  expect(config.appId).toBe("br.com.ufms.dcou");
  expect(config.productName).toBe("DCOU");
  expect(config.extraResources).toEqual([
    { from: "../frontend/dist", to: "frontend" },
    { from: "./dist/backend", to: "backend" },
  ]);
  expect(config.mac.target).toBe("dmg");
  expect(config.win.target).toBe("nsis");
  expect(config.linux.target).toEqual(["AppImage"]);
});
```

- [ ] **Step 2: Run the test and confirm the packaging config is not wired yet**

Run: `cd desktop && npm test -- tests/package-config.test.mjs`
Expected: FAIL because `electron-builder.yml` and the desktop package metadata do not exist yet.

- [ ] **Step 3: Implement the package metadata and distribution scripts**

Use this `desktop/package.json` shape:

- `name`: `dcou-desktop`
- `private`: `true`
- `main`: `electron/main.cjs`
- scripts:
  - `test`: `vitest run`
  - `build:frontend`: `npm --prefix ../frontend run build`
  - `build:backend`: `python scripts/build-backend.py`
  - `dist`: `npm run build:frontend && npm run build:backend && electron-builder --config electron-builder.yml`
- devDependencies:
  - `electron-builder`
  - `yaml`

Use this builder layout as the target:

```yaml
appId: br.com.ufms.dcou
productName: DCOU
directories:
  output: release
files:
  - electron/**/*
  - package.json
  - "!tests/**"
extraResources:
  - from: ../frontend/dist
    to: frontend
  - from: ./dist/backend
    to: backend
mac:
  target: dmg
win:
  target: nsis
linux:
  target:
    - AppImage
```

The packaging script should build the frontend, freeze the backend, then invoke electron-builder. Keep the desktop bundle independent from Docker so a user can install and run it offline after download.

- [ ] **Step 4: Re-run the packaging test until it passes**

Run: `cd desktop && npm test -- tests/package-config.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit the installer wiring slice**

```bash
git add desktop/package.json desktop/electron-builder.yml desktop/scripts/package-desktop.sh desktop/assets/icon.png desktop/tests/package-config.test.mjs
git commit -m "feat(desktop): wire cross-platform packaging" -m "- Add electron-builder metadata for macOS, Windows, and Linux targets\n- Bundle frontend assets and backend binaries as extra resources\n- Validate the packaging contract with a config test"
```

---

### Task 4: Add release smoke checks and document the desktop build

**Files:**
- Modify: `README.md`
- Create: `desktop/scripts/smoke-desktop.mjs`
- Create: `desktop/tests/release-smoke.test.mjs`

- [ ] **Step 1: Write the failing release smoke test**

```js
import { test, expect } from "vitest";
import { startPackagedDesktop } from "../scripts/smoke-desktop.mjs";

test("the packaged host serves the app and answers the healthcheck", async () => {
  const { stop, url } = await startPackagedDesktop();

  expect(await fetch(`${url}/`).then((r) => r.text())).toContain('id="root"');
  expect(await fetch(`${url}/api/health`).then((r) => r.json())).toEqual({ status: "ok" });

  await stop();
});
```

- [ ] **Step 2: Run the smoke test and confirm the release path is not assembled yet**

Run: `cd desktop && npm test -- tests/release-smoke.test.mjs`
Expected: FAIL until the packaged host wiring is complete and the smoke helper exists.

- [ ] **Step 3: Implement the smoke helper and document the desktop workflow**

The smoke helper should launch the built desktop host, wait for the local URL to respond, and then check both `/` and `/api/health`.

Use this helper contract:

```js
export async function startPackagedDesktop() {
  // spawn the packaged app, wait for the local host to answer,
  // and return { url, stop } for the smoke test.
}
```

Document these commands in `README.md`:

```bash
cd frontend
npm install
npm run build

cd ../desktop
npm install
npm run dist
```

Also document the platform outputs:

- macOS: `.dmg`
- Windows: `nsis` installer
- Linux: `.AppImage`

- [ ] **Step 4: Re-run the smoke test and verify the README matches the shipped workflow**

Run:

```bash
cd desktop
npm test -- tests/release-smoke.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit the release verification slice**

```bash
git add README.md desktop/scripts/smoke-desktop.mjs desktop/tests/release-smoke.test.mjs
git commit -m "docs(desktop): document installer workflow" -m "- Add build and release commands for the desktop bundle\n- Cover the packaged host with a release smoke test\n- Document the platform-specific installer outputs"
```

---

### Final verification

Run these commands before calling the work done:

```bash
cd frontend && npm run build
cd ../desktop && npm test
pytest demo/tests/test_desktop_bootstrap.py -q
```

Expected:

- `frontend` build succeeds.
- desktop unit and smoke tests pass.
- backend bootstrap tests pass.

If a platform build fails, fix that platform in isolation before re-running the full `dist` command for the other systems.
