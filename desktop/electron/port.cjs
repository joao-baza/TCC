const net = require("node:net");

function probePort(host, port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", (error) => {
      if (error && (error.code === "EADDRINUSE" || error.code === "EACCES")) {
        resolve(false);
        return;
      }

      reject(error);
    });

    server.listen({ host, port, exclusive: true }, () => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(true);
      });
    });
  });
}

async function findAvailablePort({ host = "127.0.0.1", startPort = 5000, maxAttempts = 50 }) {
  for (let port = startPort; port < startPort + maxAttempts; port += 1) {
    if (await probePort(host, port)) {
      return port;
    }
  }

  throw new Error(`Could not find an available port for ${host} starting at ${startPort}`);
}

module.exports = { findAvailablePort, probePort };
