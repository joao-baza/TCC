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
    "npm run dist:linux",
  );
  expect(packageJson.scripts.checksums).toBe(
    "node scripts/write-release-checksums.mjs",
  );
  expect(packageJson.scripts["dist:linux"]).toBe(
    "npm run build:frontend && npm run build:backend && electron-builder --config electron-builder.yml --linux AppImage",
  );
  expect(packageJson.scripts["dist:windows"]).toBe(
    "npm run build:frontend && npm run build:backend && electron-builder --config electron-builder.yml --win nsis",
  );
  expect(packageJson.scripts["smoke:linux"]).toBe(
    "node scripts/smoke-packaged-app.mjs --target=linux",
  );
  expect(packageJson.scripts["smoke:windows"]).toBe(
    "node scripts/smoke-packaged-app.mjs --target=windows",
  );
  expect(packageJson.scripts["smoke:macos"]).toBe(
    "node scripts/smoke-packaged-app.mjs --target=macos",
  );
});

test("backend build installs runtime requirements before packaging", () => {
  const script = readFileSync(path.resolve("scripts/build-backend.mjs"), "utf8");
  const runtimeRequirements = 'path.join(repoRoot, "requirements.txt")';
  const buildRequirements = 'path.join(desktopDir, "requirements-build.txt")';

  expect(script).toContain(runtimeRequirements);
  expect(script).toContain(buildRequirements);
  expect(script.indexOf(runtimeRequirements)).toBeLessThan(
    script.indexOf(buildRequirements),
  );
});

test("desktop publish workflow builds each desktop OS on a native runner", () => {
  const workflow = yaml.parse(
    readFileSync(path.resolve("../.github/workflows/desktop-publish.yml"), "utf8"),
  );

  expect(workflow.jobs["build-desktop"].strategy.matrix.os).toEqual([
    "ubuntu-latest",
    "macos-latest",
    "windows-latest",
  ]);

  const buildStep = workflow.jobs["build-desktop"].steps.find(
    (step) => step["name"] === "Build desktop release artifacts",
  );
  const windowsNativeStep = workflow.jobs["build-desktop"].steps.find(
    (step) => step["name"] === "Install Windows frontend native dependencies",
  );
  expect(buildStep.run).toContain("npm run dist:linux");
  expect(buildStep.run).toContain("npm run dist:windows");
  expect(buildStep.run).toContain("npm run dist");
  expect(windowsNativeStep.if).toBe("matrix.os == 'windows-latest'");
  expect(windowsNativeStep.run).toContain("lightningcss-win32-x64-msvc");
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
  const smokeStep = steps.find(
    (step) => step["name"] === "Smoke packaged release artifact",
  );
  expect(smokeStep["working-directory"]).toBe("desktop");
  expect(smokeStep.run).toContain("npm run smoke:linux");
  expect(smokeStep.run).toContain("npm run smoke:windows");
  expect(smokeStep.run).toContain("npm run smoke:macos");

  expect(checksumStepIndex).toBeGreaterThan(buildStepIndex);
  expect(uploadStepIndex).toBeGreaterThan(checksumStepIndex);
  expect(steps[checksumStepIndex]["working-directory"]).toBe("desktop");
  expect(steps[checksumStepIndex].run).toBe("npm run checksums");
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
