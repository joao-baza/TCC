import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const vitestEntrypoint = fileURLToPath(new URL("../node_modules/vitest/vitest.mjs", import.meta.url));
const result = spawnSync(
  process.execPath,
  [vitestEntrypoint, "run", "--config", "vitest.pid-benchmark.config.ts", ...process.argv.slice(2)],
  {
    env: { ...process.env, VITE_PID_ADAPTER: "local" },
    stdio: "inherit",
  },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
