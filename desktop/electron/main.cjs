const path = require("node:path");
const { spawn } = require("node:child_process");
const { app, BrowserWindow } = require("electron");
const { startDesktopHost } = require("./host.cjs");

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
  const frontendDir = app.isPackaged
    ? path.join(process.resourcesPath, "frontend")
    : path.join(__dirname, "..", "..", "frontend", "dist");

  const backendHost = "127.0.0.1";
  const backendPort = 5000;
  const backendProcess = spawnBackendProcess({ host: backendHost, port: backendPort });
  let hostServer;

  try {
    await waitForUrl(`http://${backendHost}:${backendPort}/health`);

    hostServer = await startDesktopHost({
      frontendDir,
      backendUrl: `http://${backendHost}:${backendPort}`,
    });

    const mainWindow = new BrowserWindow({
      width: 1400,
      height: 980,
      backgroundColor: "#ffffff",
    });

    await mainWindow.loadURL(hostServer.url);

    const shutdown = async () => {
      try {
        await hostServer?.close();
      } catch {
        // ignore shutdown noise
      }

      if (!backendProcess.killed) {
        backendProcess.kill();
      }
    };

    app.on("before-quit", shutdown);
    backendProcess.on("exit", () => {
      app.quit();
    });
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

if (require.main === module) {
  app.whenReady().then(createDesktopApp);
}

module.exports = {
  createDesktopApp,
  resolveBackendBinaryPath,
  spawnBackendProcess,
  waitForUrl,
};
