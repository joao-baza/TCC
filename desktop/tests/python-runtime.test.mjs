import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import { resolvePythonExecutable } from "../scripts/python-runtime.mjs";

test("prefers the repository virtualenv on linux", () => {
  const repoRoot = path.join(
    os.tmpdir(),
    `dcou-python-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );
  const pythonPath = path.join(repoRoot, ".venv", "bin", "python");

  mkdirSync(path.dirname(pythonPath), { recursive: true });
  writeFileSync(pythonPath, "#!/bin/sh\nexit 0\n");
  chmodSync(pythonPath, 0o755);

  const resolved = resolvePythonExecutable({
    repoRoot,
    env: {},
    platform: "linux",
  });

  expect(resolved).toBe(pythonPath);
});

