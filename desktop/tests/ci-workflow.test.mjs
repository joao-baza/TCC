import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import yaml from "yaml";

test("ci publish job grants permissions required by the reusable docker publish workflow", () => {
  const ciWorkflow = yaml.parse(
    readFileSync(path.resolve("../.github/workflows/ci.yml"), "utf8"),
  );
  const dockerPublishWorkflow = yaml.parse(
    readFileSync(path.resolve("../.github/workflows/docker-publish.yml"), "utf8"),
  );

  expect(ciWorkflow.jobs["publish-images"].uses).toBe(
    "./.github/workflows/docker-publish.yml",
  );
  expect(ciWorkflow.jobs["publish-images"].permissions).toMatchObject(
    dockerPublishWorkflow.permissions,
  );
});

test("ci avoids duplicate feature-branch runs by using pull requests and protected pushes", () => {
  const ciWorkflow = yaml.parse(
    readFileSync(path.resolve("../.github/workflows/ci.yml"), "utf8"),
  );

  expect(ciWorkflow.on.pull_request).toBeDefined();
  expect(ciWorkflow.on.push.branches).toEqual(["main"]);
  expect(ciWorkflow.on.push.tags).toEqual(["v*"]);
});
