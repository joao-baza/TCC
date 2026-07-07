const http = require("node:http");
const path = require("node:path");
const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

async function startDesktopHost({ frontendDir, backendUrl, port = 0, host = "127.0.0.1" }) {
  if (!frontendDir) {
    throw new Error("frontendDir is required");
  }

  if (!backendUrl) {
    throw new Error("backendUrl is required");
  }

  const indexHtml = path.join(frontendDir, "index.html");
  const app = express();

  app.use(
    "/api",
    createProxyMiddleware({
      target: backendUrl,
      changeOrigin: true,
      pathRewrite: { "^/api": "" },
    }),
  );

  app.use(
    express.static(frontendDir, {
      index: false,
      extensions: ["html"],
    }),
  );

  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }

    if (req.path.startsWith("/api/")) {
      next();
      return;
    }

    if (path.extname(req.path)) {
      next();
      return;
    }

    res.sendFile(indexHtml);
  });

  const server = http.createServer(app);

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });

  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;

  return {
    url: `http://${host}:${actualPort}`,
    async close() {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    },
  };
}

module.exports = { startDesktopHost };
