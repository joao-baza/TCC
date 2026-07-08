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
  const wineStepIndex = ubuntuSteps.findIndex(
    (step) => step["name"] === "Install Wine for Windows packaging",
  );
  const buildStepIndex = ubuntuSteps.findIndex(
    (step) => step["name"] === "Build desktop release artifacts",
  );

  expect(wineStepIndex).toBeGreaterThan(-1);
  expect(wineStepIndex).toBeLessThan(buildStepIndex);
  expect(ubuntuSteps[buildStepIndex].run).toBe("npm run dist:local");
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
