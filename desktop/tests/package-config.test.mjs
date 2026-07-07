import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import yaml from "yaml";

test("desktop packaging includes the frontend bundle and backend executable", () => {
  const config = yaml.parse(
    readFileSync(path.resolve("electron-builder.yml"), "utf8"),
  );

  expect(config.appId).toBe("br.com.ufms.dcou");
  expect(config.productName).toBe("DCOU");
  expect(config.extraResources).toEqual([
    { from: "../frontend/dist", to: "frontend" },
    { from: "./dist/backend", to: "backend" },
  ]);
  expect(config.mac.target).toBe("dmg");
  expect(config.win.target).toBe("nsis");
  expect(config.linux.target).toEqual(["AppImage"]);
});

