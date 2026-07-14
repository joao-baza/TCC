import http from "node:http";
import { createRequire } from "node:module";
import { expect, test } from "vitest";

const require = createRequire(import.meta.url);
const { runDesktopSmokeCheck } = require("../electron/smoke.cjs");

async function startServer() {
  const server = http.createServer((req, res) => {
    if (req.url === "/api/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    res.writeHead(200, { "content-type": "text/html" });
    res.end("<!doctype html><html><body><div id=\"root\">DCOU</div></body></html>");
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  return {
    url: `http://127.0.0.1:${port}`,
    async close() {
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

test("desktop smoke checks the packaged app root and proxied API health", async () => {
  const server = await startServer();
  let closed = false;
  let report;

  const result = await runDesktopSmokeCheck({
    startRuntime: async () => ({
      url: server.url,
      async close() {
        closed = true;
        await server.close();
      },
    }),
    writeReport: (payload) => {
      report = payload;
    },
  });

  expect(result.ok).toBe(true);
  expect(result.app.status).toBe(200);
  expect(result.app.body).toContain("id=\"root\"");
  expect(result.api).toEqual({ status: "ok" });
  expect(report.ok).toBe(true);
  expect(report.url).toBe(server.url);
  expect(closed).toBe(true);
});

