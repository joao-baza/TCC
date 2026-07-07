import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { startDesktopHost } from "../electron/host.cjs";

async function startMockBackend() {
  const server = http.createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  return {
    backendUrl: `http://127.0.0.1:${port}`,
    async close() {
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

export async function startPackagedDesktop() {
  const frontendDir = mkdtempSync(path.join(os.tmpdir(), "dcou-desktop-"));
  const indexHtml = `<!doctype html>
<html lang="pt-BR">
  <head><meta charset="utf-8"><title>DCOU Desktop</title></head>
  <body><div id="root">desktop</div></body>
</html>`;
  writeFileSync(path.join(frontendDir, "index.html"), indexHtml);

  const backend = await startMockBackend();
  const host = await startDesktopHost({
    frontendDir,
    backendUrl: backend.backendUrl,
  });

  return {
    url: host.url,
    async stop() {
      await host.close();
      await backend.close();
      rmSync(frontendDir, { recursive: true, force: true });
    },
  };
}

