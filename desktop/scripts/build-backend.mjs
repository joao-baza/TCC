import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolvePythonExecutable } from "./python-runtime.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(desktopDir, "..");
const python = resolvePythonExecutable({ repoRoot });

function runPython(args) {
  const result = spawnSync(python, args, {
    cwd: desktopDir,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

runPython(["-m", "pip", "install", "-r", path.join(desktopDir, "requirements-build.txt")]);
runPython([path.join(scriptDir, "build-backend.py")]);

