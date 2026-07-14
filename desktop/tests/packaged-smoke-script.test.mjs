import path from "node:path";
import { spawnSync } from "node:child_process";
import { expect, test } from "vitest";
import {
  createSmokeEnvironment,
  resolvePackagedAppCommand,
  runCommand,
} from "../scripts/smoke-packaged-app.mjs";

test("runs the Windows unpacked executable through Wine on Linux", () => {
  const releaseDir = path.join("tmp", "release");

  const command = resolvePackagedAppCommand({
    target: "windows",
    releaseDir,
    platform: "linux",
    commands: { wine: "/usr/bin/wine" },
  });

  expect(command.executable).toBe("/usr/bin/wine");
  expect(command.args).toEqual([
    path.join(releaseDir, "win-unpacked", "DCOU.exe"),
    "--disable-gpu",
    "--no-sandbox",
  ]);
  expect(command.displayName).toBe("windows-wine");
});

test("prefers Wine64 for the Windows smoke when it is available", () => {
  const releaseDir = path.join("tmp", "release");

  const command = resolvePackagedAppCommand({
    target: "windows",
    releaseDir,
    platform: "linux",
    commands: { wine: "/usr/bin/wine", wine64: "/usr/bin/wine64" },
  });

  expect(command.executable).toBe("/usr/bin/wine64");
  expect(command.args[0]).toBe(path.join(releaseDir, "win-unpacked", "DCOU.exe"));
  expect(command.displayName).toBe("windows-wine64");
});

test("runs the Linux unpacked executable with headless Electron flags", () => {
  const releaseDir = path.join("tmp", "release");

  const command = resolvePackagedAppCommand({
    target: "linux",
    releaseDir,
    platform: "linux",
    commands: {},
  });

  expect(command.executable).toBe(
    path.join(releaseDir, "linux-unpacked", "dcou-desktop"),
  );
  expect(command.args).toEqual([
    "--ozone-platform=headless",
    "--disable-gpu",
    "--no-sandbox",
  ]);
  expect(command.displayName).toBe("linux");
});

test("runs the macOS app bundle executable on macOS", () => {
  const releaseDir = path.join("tmp", "release");

  const command = resolvePackagedAppCommand({
    target: "macos",
    releaseDir,
    platform: "darwin",
    arch: "arm64",
    commands: {},
  });

  expect(command.executable).toBe(
    path.join(releaseDir, "mac-arm64", "DCOU.app", "Contents", "MacOS", "DCOU"),
  );
  expect(command.args).toEqual(["--disable-gpu", "--no-sandbox"]);
  expect(command.displayName).toBe("macos-app");
});

test("creates the smoke environment consumed by the packaged Electron entrypoint", () => {
  const env = createSmokeEnvironment({
    baseEnv: { PATH: "/usr/bin" },
    reportPath: path.join("tmp", "smoke.json"),
    winePrefix: path.join("tmp", "wine64"),
  });

  expect(env.PATH).toBe("/usr/bin");
  expect(env.DCOU_DESKTOP_SMOKE).toBe("1");
  expect(env.DCOU_DESKTOP_SMOKE_REPORT).toBe(path.join("tmp", "smoke.json"));
  expect(env.WINEARCH).toBe("win64");
  expect(env.WINEPREFIX).toBe(path.join("tmp", "wine64"));
});

test("executes the CLI entrypoint when called through node", () => {
  const result = spawnSync(
    process.execPath,
    [path.resolve("scripts/smoke-packaged-app.mjs"), "--target=invalid"],
    { cwd: path.resolve("."), encoding: "utf8" },
  );

  expect(result.status).toBe(1);
  expect(result.stderr).toContain("Unsupported target: invalid");
});

test("returns when a smoke command exceeds the timeout", async () => {
  const startedAt = Date.now();

  const result = await runCommand({
    executable: process.execPath,
    args: ["-e", "setInterval(() => undefined, 1000)"],
    env: process.env,
    timeoutMs: 50,
  });

  expect(result.timedOut).toBe(true);
  expect(Date.now() - startedAt).toBeLessThan(2000);
});
