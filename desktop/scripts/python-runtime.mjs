import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

function isExecutableCommand(command) {
  const probe = spawnSync(command, ["--version"], {
    stdio: "ignore",
    shell: false,
  });

  return probe.status === 0;
}

function candidatePaths(repoRoot, platform) {
  const candidates = [];

  if (process.env.PYTHON) {
    candidates.push(process.env.PYTHON);
  }

  if (platform === "win32") {
    candidates.push(path.join(repoRoot, ".venv", "Scripts", "python.exe"));
    candidates.push("py");
    candidates.push("python");
  } else {
    candidates.push(path.join(repoRoot, ".venv", "bin", "python"));
    candidates.push(path.join(repoRoot, ".venv", "bin", "python3"));
    candidates.push("python3");
    candidates.push("python");
  }

  return candidates;
}

export function resolvePythonExecutable({
  repoRoot,
  env = process.env,
  platform = process.platform,
} = {}) {
  if (!repoRoot) {
    throw new Error("repoRoot is required");
  }

  if (env.PYTHON) {
    const configured = env.PYTHON;
    if (path.isAbsolute(configured)) {
      if (existsSync(configured)) {
        return configured;
      }
    } else if (isExecutableCommand(configured)) {
      return configured;
    }
  }

  for (const candidate of candidatePaths(repoRoot, platform)) {
    if (candidate === env.PYTHON) {
      continue;
    }

    if (path.isAbsolute(candidate)) {
      if (existsSync(candidate)) {
        return candidate;
      }
      continue;
    }

    if (isExecutableCommand(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "No usable Python interpreter found. Set PYTHON or install python3/python in PATH.",
  );
}

