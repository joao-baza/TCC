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

test("ci publish jobs run after e2e with package permissions", () => {
  const ciWorkflow = yaml.parse(
    readFileSync(path.resolve("../.github/workflows/ci.yml"), "utf8"),
  );

  expect(ciWorkflow.jobs["publish-frontend"].needs).toBe("frontend-e2e");
  expect(ciWorkflow.jobs["publish-frontend"].permissions).toMatchObject({
    contents: "read",
    packages: "write",
  });
  expect(ciWorkflow.jobs["publish-api"].needs).toBe("publish-frontend");
  expect(ciWorkflow.jobs["publish-api"].permissions).toMatchObject({
    contents: "read",
    packages: "write",
  });
});

test("ci orders desktop packages after publish and smoke jobs", () => {
  const ciWorkflow = yaml.parse(
    readFileSync(path.resolve("../.github/workflows/ci.yml"), "utf8"),
  );

  expect(ciWorkflow.jobs["desktop-smoke"].needs).toEqual([
    "frontend-e2e",
    "publish-frontend",
    "publish-api",
  ]);
  expect(ciWorkflow.jobs["build-desktop-macos"].needs).toBe("desktop-smoke");
  expect(ciWorkflow.jobs["build-desktop-ubuntu"].needs).toBe(
    "build-desktop-macos",
  );

  const ubuntuSteps = ciWorkflow.jobs["build-desktop-ubuntu"].steps;
  const macChecksumStepIndex = ciWorkflow.jobs["build-desktop-macos"].steps.findIndex(
    (step) => step["name"] === "Generate release checksums",
  );
  const macBuildStepIndex = ciWorkflow.jobs["build-desktop-macos"].steps.findIndex(
    (step) => step["name"] === "Build desktop release artifacts",
  );
  const macUploadStepIndex = ciWorkflow.jobs["build-desktop-macos"].steps.findIndex(
    (step) => step["name"] === "Upload desktop artifacts",
  );
  const wineStepIndex = ubuntuSteps.findIndex(
    (step) => step["name"] === "Install Wine for Windows packaging",
  );
  const buildStepIndex = ubuntuSteps.findIndex(
    (step) => step["name"] === "Build desktop release artifacts",
  );
  const checksumStepIndex = ubuntuSteps.findIndex(
    (step) => step["name"] === "Generate release checksums",
  );
  const uploadStepIndex = ubuntuSteps.findIndex(
    (step) => step["name"] === "Upload desktop artifacts",
  );

  expect(wineStepIndex).toBeGreaterThan(-1);
  expect(wineStepIndex).toBeLessThan(buildStepIndex);
  expect(ubuntuSteps[wineStepIndex].run).toContain("dpkg --add-architecture i386");
  const wineInstallLine = ubuntuSteps[wineStepIndex].run
    .split("\n")
    .find((line) => line.includes("apt-get install"));
  expect(wineInstallLine).toBeDefined();
  expect(wineInstallLine.split(/\s+/)).toContain("wine");
  expect(ubuntuSteps[wineStepIndex].run).toContain("wine32:i386");
  expect(ubuntuSteps[wineStepIndex].run).toContain("wine --version");
  expect(ubuntuSteps[buildStepIndex].run).toBe("npm run dist:local");
  expect(checksumStepIndex).toBeGreaterThan(buildStepIndex);
  expect(uploadStepIndex).toBeGreaterThan(checksumStepIndex);
  expect(ubuntuSteps[checksumStepIndex]["working-directory"]).toBe("desktop/release");
  expect(ubuntuSteps[checksumStepIndex].run).toContain("-maxdepth 1");
  expect(ubuntuSteps[checksumStepIndex].run).toContain("shasum -a 256");
  expect(yamlLines(ubuntuSteps[uploadStepIndex].with.path)).toEqual(
    releaseAssetUploadPatterns,
  );
  expect(ubuntuSteps[uploadStepIndex].with.path).not.toContain(
    "desktop/release/**",
  );
  expect(macChecksumStepIndex).toBeGreaterThan(macBuildStepIndex);
  expect(macUploadStepIndex).toBeGreaterThan(macChecksumStepIndex);
  expect(
    ciWorkflow.jobs["build-desktop-macos"].steps[macChecksumStepIndex][
      "working-directory"
    ],
  ).toBe("desktop/release");
  expect(
    ciWorkflow.jobs["build-desktop-macos"].steps[macChecksumStepIndex].run,
  ).toContain("-maxdepth 1");
  expect(
    yamlLines(
      ciWorkflow.jobs["build-desktop-macos"].steps[macUploadStepIndex].with.path,
    ),
  ).toEqual(releaseAssetUploadPatterns);
  const releaseJob = ciWorkflow.jobs["publish-desktop-release"];
  expect(releaseJob.needs).toBe("build-desktop-ubuntu");
  expect(releaseJob.permissions).toMatchObject({
    actions: "read",
    contents: "write",
  });
  expect(releaseJob.if).toContain("refs/heads/main");
  expect(releaseJob.if).toContain("refs/tags/v");

  const downloadStep = releaseJob.steps.find(
    (step) => step["name"] === "Download desktop artifacts",
  );
  const releaseStep = releaseJob.steps.find(
    (step) => step["name"] === "Publish release assets",
  );

  expect(downloadStep.uses).toBe("actions/download-artifact@v8");
  expect(downloadStep.with.path).toBe("desktop-release");
  expect(downloadStep.with.pattern).toBe("desktop-*");
  expect(downloadStep.with["merge-multiple"]).toBe(true);
  expect(releaseStep.uses).toBe("softprops/action-gh-release@v2");
  expect(releaseStep.with.tag_name).toContain("desktop-");
  expect(releaseStep.with.target_commitish).toBe("${{ github.sha }}");
  expect(yamlLines(releaseStep.with.files)).toEqual(
    releaseAssetPublishPatterns,
  );
  expect(releaseStep.with.files).not.toContain("desktop-release/**");
  expect(JSON.stringify(ciWorkflow.jobs)).not.toContain("windows-latest");
});

test("ci avoids duplicate feature-branch runs by using pull requests and protected pushes", () => {
  const ciWorkflow = yaml.parse(
    readFileSync(path.resolve("../.github/workflows/ci.yml"), "utf8"),
  );

  expect(ciWorkflow.on.pull_request).toBeDefined();
  expect(ciWorkflow.on.push.branches).toEqual(["main"]);
  expect(ciWorkflow.on.push.tags).toEqual(["v*"]);
});
