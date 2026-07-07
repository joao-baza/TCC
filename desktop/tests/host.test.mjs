import { mkdtempSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import { afterEach, expect, test } from "vitest";
import { startDesktopHost } from "../electron/host.cjs";

async function startMockBackend() {
  const server = http.createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    res.writeHead(404);
    res.end("not found");
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return { server, backendUrl: `http://127.0.0.1:${port}` };
}

const cleanup = [];

afterEach(async () => {
  while (cleanup.length > 0) {
    const item = cleanup.pop();
    await item();
  }
});

test("serves the built frontend and proxies /api to the backend", async () => {
  const frontendDir = mkdtempSync(path.join(os.tmpdir(), "dcou-frontend-"));
  writeFileSync(
    path.join(frontendDir, "index.html"),
    "<!doctype html><html><body><div id=\"root\">desktop</div></body></html>",
  );

  const backend = await startMockBackend();
  cleanup.push(() => new Promise((resolve) => backend.server.close(resolve)));

  const host = await startDesktopHost({
    frontendDir,
    backendUrl: backend.backendUrl,
  });
  cleanup.push(() => host.close());

  expect(await fetch(`${host.url}/`).then((r) => r.text())).toContain("id=\"root\"");
  expect(await fetch(`${host.url}/api/health`).then((r) => r.json())).toEqual({ status: "ok" });
});

