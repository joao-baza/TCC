import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import yaml from "yaml";

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
  const macReleaseStepIndex = ciWorkflow.jobs["build-desktop-macos"].steps.findIndex(
    (step) => step["name"] === "Publish release assets",
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
  const releaseStepIndex = ubuntuSteps.findIndex(
    (step) => step["name"] === "Publish release assets",
  );

  expect(wineStepIndex).toBeGreaterThan(-1);
  expect(wineStepIndex).toBeLessThan(buildStepIndex);
  expect(ubuntuSteps[buildStepIndex].run).toBe("npm run dist:local");
  expect(checksumStepIndex).toBeGreaterThan(buildStepIndex);
  expect(uploadStepIndex).toBeGreaterThan(checksumStepIndex);
  expect(releaseStepIndex).toBeGreaterThan(uploadStepIndex);
  expect(ubuntuSteps[checksumStepIndex]["working-directory"]).toBe("desktop/release");
  expect(ubuntuSteps[checksumStepIndex].run).toContain("shasum -a 256");
  expect(ubuntuSteps[uploadStepIndex].with.path).toContain("desktop/release/**");
  expect(ubuntuSteps[releaseStepIndex].with.files).toBe("desktop/release/**");
  expect(macChecksumStepIndex).toBeGreaterThan(macBuildStepIndex);
  expect(macUploadStepIndex).toBeGreaterThan(macChecksumStepIndex);
  expect(macReleaseStepIndex).toBeGreaterThan(macUploadStepIndex);
  expect(
    ciWorkflow.jobs["build-desktop-macos"].steps[macChecksumStepIndex][
      "working-directory"
    ],
  ).toBe("desktop/release");
  expect(ciWorkflow.jobs["build-desktop-macos"].steps[macReleaseStepIndex].with.files).toBe(
    "desktop/release/**",
  );
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
