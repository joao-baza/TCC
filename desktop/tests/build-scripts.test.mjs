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

test("desktop publish workflow generates checksums and publishes a release", () => {
  const workflow = yaml.parse(
    readFileSync(path.resolve("../.github/workflows/desktop-publish.yml"), "utf8"),
  );
  const steps = workflow.jobs["build-desktop"].steps;
  const buildStepIndex = steps.findIndex(
    (step) => step["name"] === "Build desktop release artifacts",
  );
  const checksumStepIndex = steps.findIndex(
    (step) => step["name"] === "Generate release checksums",
  );
  const uploadStepIndex = steps.findIndex(
    (step) => step["name"] === "Upload desktop artifacts",
  );
  const wineStepIndex = steps.findIndex(
    (step) => step["name"] === "Install Wine for Windows packaging",
  );

  expect(wineStepIndex).toBeGreaterThan(-1);
  expect(wineStepIndex).toBeLessThan(buildStepIndex);
  expect(steps[wineStepIndex].if).toBe("matrix.os == 'ubuntu-latest'");
  expect(steps[wineStepIndex].run).toContain("apt-get install");
  expect(steps[wineStepIndex].run).toContain(" wine");
  expect(steps[wineStepIndex].run).toContain("wine64");
  expect(steps[wineStepIndex].run).toContain("wine --version");
  expect(checksumStepIndex).toBeGreaterThan(buildStepIndex);
  expect(uploadStepIndex).toBeGreaterThan(checksumStepIndex);
  expect(steps[checksumStepIndex]["working-directory"]).toBe("desktop/release");
  expect(steps[checksumStepIndex].run).toContain("shasum -a 256");
  expect(steps[checksumStepIndex].run).toContain(".sha256");
  expect(steps[uploadStepIndex].with.path).toContain("desktop/release/**");

  const publishJob = workflow.jobs["publish-release"];
  expect(publishJob.needs).toBe("build-desktop");

  const downloadStep = publishJob.steps.find(
    (step) => step["name"] === "Download desktop artifacts",
  );
  const releaseStep = publishJob.steps.find(
    (step) => step["name"] === "Publish desktop release",
  );

  expect(downloadStep.uses).toBe("actions/download-artifact@v8");
  expect(downloadStep.with.path).toBe("desktop-release");
  expect(downloadStep.with.pattern).toBe("desktop-*");
  expect(downloadStep.with["merge-multiple"]).toBe(true);
  expect(releaseStep.uses).toBe("softprops/action-gh-release@v2");
  expect(releaseStep.with.tag_name).toContain("desktop-");
  expect(releaseStep.with.target_commitish).toBe("${{ github.sha }}");
  expect(releaseStep.with.files).toBe("desktop-release/**");
});
