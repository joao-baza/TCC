import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import yaml from "yaml";

const releaseAssetUploadPatterns = [
  "desktop/release/*.exe",
  "desktop/release/*.exe.sha256",
  "desktop/release/*.dmg",
  "desktop/release/*.dmg.sha256",
  "desktop/release/*.AppImage",
  "desktop/release/*.AppImage.sha256",
];
const releaseAssetPublishPatterns = [
  "desktop-release/*.exe",
  "desktop-release/*.exe.sha256",
  "desktop-release/*.dmg",
  "desktop-release/*.dmg.sha256",
  "desktop-release/*.AppImage",
  "desktop-release/*.AppImage.sha256",
];

const yamlLines = (value) => value.trim().split("\n");

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
  expect(steps[wineStepIndex].run).toContain("dpkg --add-architecture i386");
  expect(steps[wineStepIndex].run).toContain("apt-get install");
  const wineInstallLine = steps[wineStepIndex].run
    .split("\n")
    .find((line) => line.includes("apt-get install"));
  expect(wineInstallLine).toBeDefined();
  expect(wineInstallLine.split(/\s+/)).toContain("wine");
  expect(steps[wineStepIndex].run).toContain("wine32:i386");
  expect(steps[wineStepIndex].run).toContain("wine --version");
  expect(checksumStepIndex).toBeGreaterThan(buildStepIndex);
  expect(uploadStepIndex).toBeGreaterThan(checksumStepIndex);
  expect(steps[checksumStepIndex]["working-directory"]).toBe("desktop/release");
  expect(steps[checksumStepIndex].run).toContain("-maxdepth 1");
  expect(steps[checksumStepIndex].run).toContain("shasum -a 256");
  expect(steps[checksumStepIndex].run).toContain(".sha256");
  expect(yamlLines(steps[uploadStepIndex].with.path)).toEqual(
    releaseAssetUploadPatterns,
  );
  expect(steps[uploadStepIndex].with.path).not.toContain("desktop/release/**");

  const publishJob = workflow.jobs["publish-release"];
  expect(publishJob.needs).toBe("build-desktop");
  expect(publishJob.permissions).toMatchObject({
    actions: "read",
    contents: "write",
  });

  const downloadStep = publishJob.steps.find(
    (step) => step["name"] === "Download desktop artifacts",
  );
  const metadataStep = publishJob.steps.find(
    (step) => step["name"] === "Compute desktop release metadata",
  );
  const releaseStep = publishJob.steps.find(
    (step) => step["name"] === "Publish desktop release",
  );

  expect(downloadStep.uses).toBe("actions/download-artifact@v8");
  expect(downloadStep.with.path).toBe("desktop-release");
  expect(downloadStep.with.pattern).toBe("desktop-*");
  expect(downloadStep.with["merge-multiple"]).toBe(true);
  expect(metadataStep.run).toContain("TZ=Etc/GMT+3");
  expect(metadataStep.run).toContain("release_name=Aplicação desktop - ");
  expect(metadataStep.run).toContain("tag_name=desktop-");
  expect(releaseStep.uses).toBe("softprops/action-gh-release@v2");
  expect(releaseStep.with.tag_name).toBe(
    "${{ steps.release_meta.outputs.tag_name }}",
  );
  expect(releaseStep.with.target_commitish).toBe("${{ github.sha }}");
  expect(releaseStep.with.name).toBe(
    "${{ steps.release_meta.outputs.release_name }}",
  );
  expect(yamlLines(releaseStep.with.files)).toEqual(
    releaseAssetPublishPatterns,
  );
  expect(releaseStep.with.files).not.toContain("desktop-release/**");
});
