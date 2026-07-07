import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { resolvePythonExecutable } from "../scripts/python-runtime.mjs";

test("models package import stays lightweight", () => {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const python = resolvePythonExecutable({ repoRoot });

  const result = spawnSync(
    python,
    [
      "-c",
      [
        "import sys",
        "import models",
        "print(int(any(name in sys.modules for name in ('numpy', 'scipy', 'matplotlib'))))",
      ].join("; "),
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );

  expect(result.status).toBe(0);
  expect(result.stdout.trim()).toBe("0");
});
