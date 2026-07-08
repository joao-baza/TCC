import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";

test("frontend lockfile includes lightningcss native packages required by desktop publish runners", () => {
  const lockfile = JSON.parse(
    readFileSync(path.resolve("../frontend/package-lock.json"), "utf8"),
  );

  expect(lockfile.packages["node_modules/lightningcss-darwin-arm64"]).toMatchObject({
    version: lockfile.packages["node_modules/lightningcss"].version,
    cpu: ["arm64"],
    os: ["darwin"],
    optional: true,
  });
  expect(lockfile.packages["node_modules/lightningcss-linux-x64-gnu"]).toMatchObject({
    version: lockfile.packages["node_modules/lightningcss"].version,
    cpu: ["x64"],
    os: ["linux"],
    optional: true,
  });
});
