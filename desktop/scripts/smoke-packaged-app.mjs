import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(scriptDir, "..");
const commonElectronArgs = ["--disable-gpu", "--no-sandbox"];
const linuxHeadlessArgs = ["--ozone-platform=headless", ...commonElectronArgs];

function findCommand(name) {
  const result = spawnSync("sh", ["-lc", `command -v ${name}`], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    return undefined;
  }

  return result.stdout.trim() || undefined;
}

function parseArgs(argv) {
  const options = {
    target: process.platform === "darwin" ? "macos" : process.platform,
    releaseDir: path.join(desktopDir, "release"),
    timeoutMs: 60000,
  };

  for (const arg of argv) {
    if (arg.startsWith("--target=")) {
      options.target = arg.slice("--target=".length);
      continue;
    }

    if (arg.startsWith("--release-dir=")) {
      options.releaseDir = path.resolve(arg.slice("--release-dir=".length));
      continue;
    }

    if (arg.startsWith("--timeout-ms=")) {
      options.timeoutMs = Number(arg.slice("--timeout-ms=".length));
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function macAppExecutable({ releaseDir, arch }) {
  const appDir = arch === "arm64" ? "mac-arm64" : "mac";
  return path.join(releaseDir, appDir, "DCOU.app", "Contents", "MacOS", "DCOU");
}

function resolvePackagedAppCommand({
  target,
  releaseDir,
  platform = process.platform,
  arch = process.arch,
  commands = {
    wine: findCommand("wine"),
    wine64: findCommand("wine64"),
    xvfbRun: findCommand("xvfb-run"),
  },
} = {}) {
  if (!target) {
    throw new Error("target is required");
  }

  if (!releaseDir) {
    throw new Error("releaseDir is required");
  }

  if (target === "windows") {
    const windowsExecutable = path.join(releaseDir, "win-unpacked", "DCOU.exe");

    if (platform === "win32") {
      return {
        displayName: "windows",
        executable: windowsExecutable,
        args: commonElectronArgs,
      };
    }

    const wineExecutable = commands.wine64 || commands.wine;
    const wineDisplayName = commands.wine64 ? "wine64" : "wine";

    if (!wineExecutable) {
      throw new Error("Wine is required to smoke the Windows package outside Windows");
    }

    if (platform === "linux" && commands.xvfbRun) {
      return {
        displayName: `windows-${wineDisplayName}-xvfb`,
        executable: commands.xvfbRun,
        args: ["-a", wineExecutable, windowsExecutable, ...commonElectronArgs],
      };
    }

    return {
      displayName: `windows-${wineDisplayName}`,
      executable: wineExecutable,
      args: [windowsExecutable, ...commonElectronArgs],
    };
  }

  if (target === "macos") {
    if (platform !== "darwin") {
      throw new Error("macOS packaged apps must be smoked on macOS");
    }

    return {
      displayName: "macos-app",
      executable: macAppExecutable({ releaseDir, arch }),
      args: commonElectronArgs,
    };
  }

  if (target === "linux") {
    const linuxExecutable = path.join(releaseDir, "linux-unpacked", "dcou-desktop");

    if (platform === "linux" && commands.xvfbRun) {
      return {
        displayName: "linux-xvfb",
        executable: commands.xvfbRun,
        args: ["-a", linuxExecutable, ...linuxHeadlessArgs],
      };
    }

    return {
      displayName: "linux",
      executable: linuxExecutable,
      args: linuxHeadlessArgs,
    };
  }

  throw new Error(`Unsupported target: ${target}`);
}

function createSmokeEnvironment({ baseEnv = process.env, reportPath, winePrefix }) {
  const env = {
    ...baseEnv,
    DCOU_DESKTOP_SMOKE: "1",
    DCOU_DESKTOP_SMOKE_REPORT: reportPath,
  };

  if (winePrefix) {
    env.WINEARCH = "win64";
    env.WINEPREFIX = winePrefix;
  }

  return env;
}

async function runCommand({ executable, args, env, timeoutMs }) {
  return await new Promise((resolve) => {
    const detached = process.platform !== "win32";
    const child = spawn(executable, args, {
      env,
      cwd: desktopDir,
      detached,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      if (detached && child.pid) {
        try {
          process.kill(-child.pid, "SIGKILL");
          return;
        } catch {
          // fall back to killing the direct child below
        }
      }

      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ status: 1, stdout, stderr: `${stderr}${error.stack}\n`, timedOut });
    });
    child.on("close", (status) => {
      clearTimeout(timer);
      resolve({ status, stdout, stderr, timedOut });
    });
  });
}

async function smokePackagedApp(options) {
  const command = resolvePackagedAppCommand(options);

  if (!existsSync(command.executable) && command.displayName !== "windows-wine-xvfb") {
    throw new Error(`Packaged executable not found: ${command.executable}`);
  }

  const tempDir = mkdtempSync(path.join(os.tmpdir(), "dcou-smoke-"));
  const reportPath = path.join(tempDir, "smoke-report.json");
  const winePrefix =
    options.target === "windows" && process.platform !== "win32"
      ? path.join(tempDir, "wine64")
      : undefined;

  try {
    const result = await runCommand({
      ...command,
      env: createSmokeEnvironment({ reportPath, winePrefix }),
      timeoutMs: options.timeoutMs,
    });

    if (result.status !== 0 || result.timedOut) {
      throw new Error(
        [
          `Packaged smoke failed for ${command.displayName}`,
          `status=${result.status}`,
          `timedOut=${result.timedOut}`,
          "stdout:",
          result.stdout.trim(),
          "stderr:",
          result.stderr.trim(),
        ].join("\n"),
      );
    }

    const report = JSON.parse(readFileSync(reportPath, "utf8"));

    if (!report.ok) {
      throw new Error(`Packaged smoke report is not ok: ${JSON.stringify(report)}`);
    }

    console.log(JSON.stringify({ target: options.target, command: command.displayName, report }));
    return report;
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  smokePackagedApp(parseArgs(process.argv.slice(2))).catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}

export {
  createSmokeEnvironment,
  parseArgs,
  resolvePackagedAppCommand,
  runCommand,
  smokePackagedApp,
};
