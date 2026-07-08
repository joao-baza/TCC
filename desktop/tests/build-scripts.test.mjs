import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import yaml from "yaml";

test("desktop package scripts expose a local linux and windows build", () => {
  const packageJson = JSON.parse(
    readFileSync(path.resolve("package.json"), "utf8"),
  );

  expect(packageJson.scripts.dist).toBe(
    "npm run build:frontend && npm run build:backend && electron-builder --config electron-builder.yml",
  );
  expect(packageJson.scripts["dist:local"]).toBe(
    "npm run build:frontend && npm run build:backend && electron-builder --config electron-builder.yml --linux AppImage --win nsis",
  );
});

test("desktop publish workflow uses the local cross-build on linux and macos on mac", () => {
  const workflow = yaml.parse(
    readFileSync(path.resolve("../.github/workflows/desktop-publish.yml"), "utf8"),
  );

  expect(workflow.jobs["build-desktop"].strategy.matrix.os).toEqual([
    "ubuntu-latest",
    "macos-latest",
  ]);

  const buildStep = workflow.jobs["build-desktop"].steps.find(
    (step) => step["name"] === "Build desktop release artifacts",
  );
  expect(buildStep.run).toContain("npm run dist:local");
  expect(buildStep.run).toContain("npm run dist");
  expect(JSON.stringify(workflow)).not.toContain("windows-latest");
});

test("desktop publish workflow installs wine before cross-building windows artifacts on linux", () => {
  const workflow = yaml.parse(
    readFileSync(path.resolve("../.github/workflows/desktop-publish.yml"), "utf8"),
  );
  const steps = workflow.jobs["build-desktop"].steps;
  const wineStepIndex = steps.findIndex(
    (step) => step["name"] === "Install Wine for Windows packaging",
  );
  const buildStepIndex = steps.findIndex(
    (step) => step["name"] === "Build desktop release artifacts",
  );

  expect(wineStepIndex).toBeGreaterThan(-1);
  expect(wineStepIndex).toBeLessThan(buildStepIndex);
  expect(steps[wineStepIndex].if).toBe("matrix.os == 'ubuntu-latest'");
  expect(steps[wineStepIndex].run).toContain("apt-get install");
  expect(steps[wineStepIndex].run).toContain("wine64");
});
