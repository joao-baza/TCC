async function runDesktopSmokeCheck({
  startRuntime,
  fetchImpl = fetch,
  writeReport = () => undefined,
} = {}) {
  if (!startRuntime) {
    throw new Error("startRuntime is required");
  }

  let runtime;

  try {
    runtime = await startRuntime();

    const appResponse = await fetchImpl(`${runtime.url}/`);
    const appBody = await appResponse.text();
    const api = await fetchImpl(`${runtime.url}/api/health`).then((response) =>
      response.json(),
    );

    const report = {
      ok: appResponse.ok && api.status === "ok",
      url: runtime.url,
      app: {
        status: appResponse.status,
        body: appBody,
      },
      api,
    };

    writeReport(report);

    if (!report.ok) {
      throw new Error(`Desktop smoke failed for ${runtime.url}`);
    }

    return report;
  } finally {
    if (runtime) {
      await runtime.close();
    }
  }
}

module.exports = { runDesktopSmokeCheck };

