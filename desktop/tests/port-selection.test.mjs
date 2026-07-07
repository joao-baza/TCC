import net from "node:net";
import { expect, test } from "vitest";
import { findAvailablePort } from "../electron/port.cjs";

test("findAvailablePort skips a port that is already in use", async () => {
  const occupied = net.createServer();
  await new Promise((resolve) => occupied.listen(0, "127.0.0.1", resolve));

  try {
    const address = occupied.address();
    const occupiedPort = typeof address === "object" && address ? address.port : 0;
    const selectedPort = await findAvailablePort({
      host: "127.0.0.1",
      startPort: occupiedPort,
      maxAttempts: 5,
    });

    expect(selectedPort).toBeGreaterThan(occupiedPort);
  } finally {
    await new Promise((resolve) => occupied.close(resolve));
  }
});
