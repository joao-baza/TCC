import { expect, test } from "vitest";
import { startPackagedDesktop } from "../scripts/smoke-desktop.mjs";

test("the packaged host serves the app and answers the healthcheck", async () => {
  const { stop, url } = await startPackagedDesktop();

  expect(await fetch(`${url}/`).then((r) => r.text())).toContain('id="root"');
  expect(await fetch(`${url}/api/health`).then((r) => r.json())).toEqual({ status: "ok" });

  await stop();
});

