const path = require("node:path");
const { writeFileSync } = require("node:fs");
const { spawn } = require("node:child_process");
const { app, BrowserWindow } = require("electron");
const { startDesktopHost } = require("./host.cjs");
const { findAvailablePort } = require("./port.cjs");
const { runDesktopSmokeCheck } = require("./smoke.cjs");

async function waitForUrl(url, timeoutMs = 30000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // keep polling
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

function resolveBackendBinaryPath() {
  if (process.env.DCOU_BACKEND_PATH) {
    return process.env.DCOU_BACKEND_PATH;
  }

  const binaryName = process.platform === "win32" ? "backend.exe" : "backend";

  if (app.isPackaged) {
    return path.join(process.resourcesPath, "backend", binaryName);
  }

  return path.join(__dirname, "..", "dist", "backend", binaryName);
}

function spawnBackendProcess({ host, port }) {
  const backendPath = resolveBackendBinaryPath();
  const child = spawn(backendPath, [], {
    env: {
      ...process.env,
      DCOU_HOST: host,
      DCOU_PORT: String(port),
    },
    stdio: "inherit",
  });

  return child;
}

async function createDesktopApp() {
  const runtime = await startDesktopRuntime();

  try {
    const mainWindow = new BrowserWindow({
      width: 1400,
      height: 980,
      backgroundColor: "#ffffff",
    });

    await mainWindow.loadURL(runtime.url);

    app.on("before-quit", () => {
      runtime.close().catch(() => undefined);
    });
    runtime.backendProcess.on("exit", () => {
      app.quit();
    });
  } catch (error) {
    await runtime.close().catch(() => undefined);
    throw error;
  }
}

async function startDesktopRuntime() {
  const frontendDir = app.isPackaged
    ? path.join(process.resourcesPath, "frontend")
    : path.join(__dirname, "..", "..", "frontend", "dist");

  const backendHost = "127.0.0.1";
  const backendPort = await findAvailablePort({ host: backendHost, startPort: 5000 });
  const backendProcess = spawnBackendProcess({ host: backendHost, port: backendPort });
  let hostServer;
  let closed = false;

  try {
    await waitForUrl(`http://${backendHost}:${backendPort}/health`);

    hostServer = await startDesktopHost({
      frontendDir: path.resolve(frontendDir),
      backendUrl: `http://${backendHost}:${backendPort}`,
    });

    return {
      url: hostServer.url,
      backendProcess,
      async close() {
        if (closed) {
          return;
        }

        closed = true;

        try {
          await hostServer?.close();
        } catch {
          // ignore shutdown noise
        }

        if (!backendProcess.killed) {
          backendProcess.kill();
        }
      },
    };
  } catch (error) {
    if (hostServer) {
      await hostServer.close().catch(() => undefined);
    }

    if (!backendProcess.killed) {
      backendProcess.kill();
    }

    throw error;
  }
}

async function runPackagedSmoke() {
  const report = await runDesktopSmokeCheck({
    startRuntime: startDesktopRuntime,
    writeReport(payload) {
      const reportPath = process.env.DCOU_DESKTOP_SMOKE_REPORT;
      if (reportPath) {
        writeFileSync(reportPath, `${JSON.stringify(payload, null, 2)}\n`);
      }
    },
  });

  console.log(JSON.stringify(report));
}

if (require.main === module) {
  app
    .whenReady()
    .then(async () => {
      if (process.env.DCOU_DESKTOP_SMOKE === "1") {
        await runPackagedSmoke();
        app.quit();
        return;
      }

      await createDesktopApp();
    })
    .catch((error) => {
      console.error(error);
      app.exit(1);
    });
}

module.exports = {
  createDesktopApp,
  runPackagedSmoke,
  resolveBackendBinaryPath,
  spawnBackendProcess,
  startDesktopRuntime,
  waitForUrl,
};
