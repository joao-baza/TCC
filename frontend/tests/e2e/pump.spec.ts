import { expect, test } from "@playwright/test";

async function selectComboboxOption(page, label, query) {
  const input = page.getByRole("combobox", { name: label });
  await input.fill(query);
  await input.press("Enter");
}

test("pump module loads the example and calculates the main results", async ({
  page,
}) => {
  await page.route("**/api/pump/example", async (route) => {
    await route.fulfill({
      json: {
        headloss: {
          method: "Darcy-Weisbach",
          pipe_length: 100,
          diameter: 125,
          flow_rate: 0.04,
          velocity: 3.259493234522017,
          reynolds: 3186.1046722863807,
          friction_factor: 0.04495094389484752,
          friction_method: "SwameeJain",
          composition: "Aço galvanizado",
          fittings: [],
        },
        npsh: {
          manometric_pressure: 0,
          atmospheric_pressure: 1.033,
          vapor_pressure: 0.023,
          density: 1000,
          friction_factor: 10,
          pump_inlet_velocity: 1.5,
          gauge_elevation: 3,
          required: 3,
        },
        head: {
          pressure1: 101325,
          pressure2: 101325,
          elevation1: 0,
          elevation2: 5,
          velocity1: 0,
          velocity2: 3,
          density: 1000,
          friction_factor: 2.55887,
        },
      },
    });
  });

  await page.route("**/api/pump/headloss/methods", async (route) => {
    await route.fulfill({
      json: ["Darcy-Weisbach", "Hazen-Williams"],
    });
  });

  await page.route("**/api/piping/fittings", async (route) => {
    await route.fulfill({
      json: ["Cotovelo 90° raio longo", "Válvula gaveta"],
    });
  });

  await page.route("**/api/piping/compositions", async (route) => {
    await route.fulfill({
      json: ["Aço galvanizado", "Aço comercial", "PVC"],
    });
  });

  await page.route("**/api/flow/friction-factor/methods", async (route) => {
    await route.fulfill({
      json: ["ColebrookWhite", "SwameeJain"],
    });
  });

  await page.route("**/api/piping/composition/A%C3%A7o%20galvanizado", async (route) => {
    await route.fulfill({
      json: {
        name: "Aço galvanizado",
        specifications: {
          roughness: { value: 0.045, units: "millimeter" },
          roughness_coefficient: { value: 130, units: "dimensionless" },
        },
      },
    });
  });

  await page.route("**/api/flow/friction-factor", async (route) => {
    await route.fulfill({
      json: { value: 0.0215, units: "dimensionless" },
    });
  });

  await page.route("**/api/pump/headloss", async (route) => {
    await route.fulfill({
      json: { value: 4.25, units: "meter" },
    });
  });

  await page.route("**/api/pump/headloss/chart", async (route) => {
    await route.fulfill({
      json: {
        id: "pump-system-curve",
        title: "Curva da bomba e do sistema",
        axes: {
          x: {
            scale: "linear",
            label: "Vazão volumétrica",
            units: "m³/s",
            domain: { min: 0, max: 0.06 },
            ticks: [0, 0.02, 0.04, 0.06],
            major_ticks: [0, 0.02, 0.04, 0.06],
          },
          y: {
            scale: "linear",
            label: "Altura manométrica",
            units: "m",
            domain: { min: 0, max: 30 },
            ticks: [0, 10, 20, 30],
            major_ticks: [0, 10, 20, 30],
          },
        },
        series: [
          { id: "pump-curve", name: "Curva da bomba", kind: "line", color: "#0f766e", points: [{ x: 0, y: 28 }, { x: 0.04, y: 4.25 }, { x: 0.06, y: 0 }] },
          { id: "system-curve", name: "Curva do sistema", kind: "line", color: "#d97706", points: [{ x: 0, y: 0 }, { x: 0.04, y: 4.25 }, { x: 0.06, y: 9.5 }] },
        ],
        markers: [{ id: "operating-point", x: 0.04, y: 4.25, label: "Ponto de operação", color: "#dc2626" }],
        annotations: [],
        metadata: { version: "1.0", units: { x: "m³/s", y: "m" } },
      },
    });
  });

  await page.route("**/api/pump/efficiency-map/chart", async (route) => {
    await route.fulfill({
      json: {
        id: "pump-efficiency-map",
        title: "Mapa de eficiência",
        x_axis: { label: "Vazão volumétrica (Q)", units: "m³/s", domain: { min: 0, max: 0.06 }, ticks: [0, 0.03, 0.06] },
        y_axis: { label: "Altura manométrica (H)", units: "m", domain: { min: 0, max: 30 }, ticks: [0, 15, 30] },
        cells: [],
        system_curve: [{ x: 0, y: 0 }, { x: 0.04, y: 4.25 }, { x: 0.06, y: 9.5 }],
        cavitation_band: [],
        markers: [{ id: "operating-point", x: 0.04, y: 4.25, label: "Operação", color: "#dc2626" }],
      },
    });
  });

  await page.route("**/api/pump/npsh-available", async (route) => {
    await route.fulfill({
      json: {
        head_loss: { value: 6.8, units: "meter" },
      },
    });
  });

  await page.route("**/api/pump/npsh-gauge/chart", async (route) => {
    await route.fulfill({
      json: {
        id: "pump-npsh-gauge",
        title: "Margem de NPSH",
        available: { value: 6.8, units: "meter" },
        required: { value: 3, units: "meter" },
        safe_threshold: { value: 3.5, units: "meter" },
        status: { tone: "safe", label: "Margem segura", message: "Folga suficiente." },
        axis: { scale: "linear", label: "NPSH", units: "m", domain: { min: 0, max: 8 }, ticks: [0, 2, 4, 6, 8], major_ticks: [0, 2, 4, 6, 8] },
        markers: [
          { id: "available", x: 6.8, y: 0, label: "NPSHd", color: "#1d4ed8" },
          { id: "required", x: 3, y: 0, label: "NPSHr", color: "#b45309" },
          { id: "safe-threshold", x: 3.5, y: 0, label: "Margem segura", color: "#16a34a" },
        ],
      },
    });
  });

  await page.route("**/api/pump/head", async (route) => {
    await route.fulfill({
      json: { value: 18.2, units: "meter" },
    });
  });

  await page.route("**/api/pump/head/chart", async (route) => {
    await route.fulfill({
      json: {
        id: "pump-head-chart",
        title: "Decomposição da altura manométrica",
        axes: {
          x: { scale: "linear", label: "Termos", units: "", domain: { min: 0, max: 4 }, ticks: [0, 1, 2, 3, 4], major_ticks: [0, 1, 2, 3, 4] },
          y: { scale: "linear", label: "Altura", units: "m", domain: { min: 0, max: 20 }, ticks: [0, 10, 20], major_ticks: [0, 10, 20] },
        },
        series: [{ id: "head-terms", name: "Termos", kind: "bar", color: "#2563eb", points: [{ x: 1, y: 18.2 }] }],
        markers: [],
        annotations: [{ id: "head-note", text: "Decomposição", tone: "info" }],
        metadata: { version: "1.0", units: { x: "", y: "m" } },
      },
    });
  });

  await page.goto("/pump");
  await expect(page.getByRole("heading", { name: /Perda de Carga e Bombas/i })).toBeVisible();

  await page.getByRole("button", { name: /Carregar exemplo/i }).click();
  await expect(page.getByLabel(/Comprimento da linha/i)).toHaveValue("100");
  await expect(page.getByRole("button", { name: /Calcular perda de carga/i })).toBeVisible();
  await page.waitForTimeout(150);
  await page.getByRole("button", { name: /Calcular perda de carga/i }).click();
  const headlossTable = page.locator("table").filter({ hasText: "Perda de carga" }).first();
  await expect(headlossTable).toBeVisible();
  await expect(headlossTable).toContainText("4,25");
  await expect(page.getByRole("img", { name: /Curva da bomba e do sistema/i })).toBeVisible();

  await page.getByRole("tab", { name: /NPSH Disponível/i }).click();
  await page.getByRole("button", { name: /Calcular NPSH disponível/i }).click();
  await expect(page.locator("table").filter({ hasText: "NPSH disponível" }).first()).toContainText("6,8");
  await expect(page.getByText(/NPSHd/i)).toBeVisible();

  await page.getByRole("tab", { name: /Altura Manométrica/i }).click();
  await page.getByLabel(/Pressão 1/i).fill("101325");
  await page.getByLabel(/Pressão 2/i).fill("101325");
  await page.getByLabel(/Elevação 1/i).fill("0");
  await page.getByLabel(/Elevação 2/i).fill("5");
  await page.getByLabel(/Velocidade 1/i).fill("0");
  await page.getByLabel(/Velocidade 2/i).fill("3");
  await page.getByLabel(/Massa específica do fluido/i).fill("1000");
  await page.getByLabel(/Perda de carga total/i).fill("2.55887");
  await page.getByRole("button", { name: /Calcular altura manométrica/i }).click();
  await expect(page.getByText(/18,2 m/i)).toBeVisible();
  await expect(page.getByText(/Decomposição/i)).toBeVisible();
});

test("pump module clears headloss results after the base inputs change", async ({ page }) => {
  await page.route("**/api/pump/example", async (route) => {
    await route.fulfill({
      json: {
        headloss: {
          method: "Darcy-Weisbach",
          pipe_length: 100,
          diameter: 125,
          flow_rate: 0.04,
          velocity: 3.259493234522017,
          reynolds: 3186.1046722863807,
          friction_factor: 0.04495094389484752,
          friction_method: "SwameeJain",
          composition: "Aço galvanizado",
          fittings: [],
        },
        npsh: {
          manometric_pressure: 0,
          atmospheric_pressure: 1.033,
          vapor_pressure: 0.023,
          density: 1000,
          friction_factor: 10,
          pump_inlet_velocity: 1.5,
          gauge_elevation: 3,
          required: 3,
        },
        head: {
          pressure1: 101325,
          pressure2: 101325,
          elevation1: 0,
          elevation2: 5,
          velocity1: 0,
          velocity2: 3,
          density: 1000,
          friction_factor: 2.55887,
        },
      },
    });
  });

  await page.route("**/api/pump/headloss/methods", async (route) => {
    await route.fulfill({
      json: ["Darcy-Weisbach", "Hazen-Williams"],
    });
  });

  await page.route("**/api/piping/fittings", async (route) => {
    await route.fulfill({
      json: ["Cotovelo 90° raio longo", "Válvula gaveta"],
    });
  });

  await page.route("**/api/piping/compositions", async (route) => {
    await route.fulfill({
      json: ["Aço galvanizado", "Aço comercial", "PVC"],
    });
  });

  await page.route("**/api/flow/friction-factor/methods", async (route) => {
    await route.fulfill({
      json: ["ColebrookWhite", "SwameeJain"],
    });
  });

  await page.route("**/api/piping/composition/A%C3%A7o%20galvanizado", async (route) => {
    await route.fulfill({
      json: {
        name: "Aço galvanizado",
        specifications: {
          roughness: { value: 0.045, units: "millimeter" },
          roughness_coefficient: { value: 130, units: "dimensionless" },
        },
      },
    });
  });

  await page.route("**/api/flow/friction-factor", async (route) => {
    await route.fulfill({
      json: { value: 0.0215, units: "dimensionless" },
    });
  });

  await page.route("**/api/pump/headloss", async (route) => {
    await route.fulfill({
      json: { value: 4.25, units: "meter" },
    });
  });

  await page.route("**/api/pump/headloss/chart", async (route) => {
    await route.fulfill({
      json: {
        id: "pump-system-curve",
        title: "Curva da bomba e do sistema",
        axes: {
          x: { scale: "linear", label: "Vazão volumétrica", units: "m³/s", domain: { min: 0, max: 0.06 }, ticks: [0, 0.02, 0.04, 0.06], major_ticks: [0, 0.02, 0.04, 0.06] },
          y: { scale: "linear", label: "Altura manométrica", units: "m", domain: { min: 0, max: 30 }, ticks: [0, 10, 20, 30], major_ticks: [0, 10, 20, 30] },
        },
        series: [
          { id: "pump-curve", name: "Curva da bomba", kind: "line", color: "#0f766e", points: [{ x: 0, y: 28 }, { x: 0.04, y: 4.25 }, { x: 0.06, y: 0 }] },
          { id: "system-curve", name: "Curva do sistema", kind: "line", color: "#d97706", points: [{ x: 0, y: 0 }, { x: 0.04, y: 4.25 }, { x: 0.06, y: 9.5 }] },
        ],
        markers: [{ id: "operating-point", x: 0.04, y: 4.25, label: "Ponto de operação", color: "#dc2626" }],
        annotations: [],
        metadata: { version: "1.0", units: { x: "m³/s", y: "m" } },
      },
    });
  });

  await page.route("**/api/pump/efficiency-map/chart", async (route) => {
    await route.fulfill({
      json: {
        id: "pump-efficiency-map",
        title: "Mapa de eficiência",
        x_axis: { label: "Vazão volumétrica (Q)", units: "m³/s", domain: { min: 0, max: 0.06 }, ticks: [0, 0.03, 0.06] },
        y_axis: { label: "Altura manométrica (H)", units: "m", domain: { min: 0, max: 30 }, ticks: [0, 15, 30] },
        cells: [],
        system_curve: [{ x: 0, y: 0 }, { x: 0.04, y: 4.25 }, { x: 0.06, y: 9.5 }],
        cavitation_band: [],
        markers: [{ id: "operating-point", x: 0.04, y: 4.25, label: "Operação", color: "#dc2626" }],
      },
    });
  });

  await page.goto("/pump");
  await page.getByRole("tab", { name: /Perda de Carga/i }).click();
  await page.getByRole("button", { name: /Carregar exemplo/i }).click();
  await expect(page.getByLabel(/Comprimento da linha/i)).toHaveValue("100");
  await expect(page.getByRole("button", { name: /Calcular perda de carga/i })).toBeVisible();
  await page.waitForTimeout(150);
  await page.getByRole("button", { name: /Calcular perda de carga/i }).click();

  const headlossTable = page.locator("table").filter({ hasText: "Perda de carga" }).first();
  await expect(headlossTable).toBeVisible();
  await expect(headlossTable).toContainText("4,25");
  await expect(page.getByRole("img", { name: /Curva da bomba e do sistema/i })).toBeVisible();

  await page.getByLabel(/Comprimento da linha/i).fill("120");

  await expect(headlossTable).toContainText("—");
  await expect(headlossTable).not.toContainText("4,25");
  await expect(page.getByRole("img", { name: /Curva da bomba e do sistema/i })).toHaveCount(0);
});

test("pump module surfaces an error when head loss calculation fails", async ({ page }) => {
  await page.route("**/api/pump/headloss/methods", async (route) => {
    await route.fulfill({
      json: ["Darcy-Weisbach", "Hazen-Williams"],
    });
  });

  await page.route("**/api/piping/fittings", async (route) => {
    await route.fulfill({
      json: ["Cotovelo 90° raio longo", "Válvula gaveta"],
    });
  });

  await page.route("**/api/piping/compositions", async (route) => {
    await route.fulfill({
      json: ["Aço comercial", "PVC"],
    });
  });

  await page.route("**/api/flow/friction-factor/methods", async (route) => {
    await route.fulfill({
      json: ["ColebrookWhite", "SwameeJain"],
    });
  });

  await page.route("**/api/pump/headloss", async (route) => {
    await route.fulfill({
      status: 400,
      json: {
        detail: "Falha no backend de perda de carga",
      },
    });
  });

  await page.goto("/pump");
  await expect(page.getByRole("heading", { name: /Perda de Carga e Bombas/i })).toBeVisible();

  await page.getByRole("tab", { name: /Perda de Carga/i }).click();
  await page.getByLabel(/Comprimento da linha/i).fill("25");
  await page.getByLabel(/Diâmetro interno/i).fill("50");
  await page.getByLabel(/Vazão/i).fill("0.005");
  await page.getByLabel(/Fator de atrito/i).fill("0.02");
  await page.getByRole("button", { name: /Calcular perda de carga/i }).click();

  await expect(page.locator("p.text-red-600")).toContainText(
    /Erro ao calcular perda de carga: Falha no backend de perda de carga/i,
  );
});

test("pump module surfaces an error when the friction-factor lookup fails during headloss calculation", async ({
  page,
}) => {
  await page.route("**/api/pump/headloss/methods", async (route) => {
    await route.fulfill({
      json: ["Darcy-Weisbach", "Hazen-Williams"],
    });
  });

  await page.route("**/api/piping/fittings", async (route) => {
    await route.fulfill({
      json: ["Cotovelo 90° raio longo", "Válvula gaveta"],
    });
  });

  await page.route("**/api/piping/compositions", async (route) => {
    await route.fulfill({
      json: ["Aço comercial", "PVC"],
    });
  });

  await page.route("**/api/flow/friction-factor/methods", async (route) => {
    await route.fulfill({
      json: ["ColebrookWhite", "SwameeJain"],
    });
  });

  await page.route("**/api/piping/composition/A%C3%A7o%20comercial", async (route) => {
    await route.fulfill({
      json: {
        name: "Aço comercial",
        specifications: {
          roughness: { value: 0.045, units: "millimeter" },
          roughness_coefficient: { value: 130, units: "dimensionless" },
        },
      },
    });
  });

  await page.route("**/api/flow/friction-factor", async (route) => {
    await route.fulfill({
      status: 400,
      json: { detail: "Falha no backend do fator de atrito" },
    });
  });

  await page.goto("/pump");
  await expect(page.getByRole("heading", { name: /Perda de Carga e Bombas/i })).toBeVisible();

  await page.getByRole("tab", { name: /Perda de Carga/i }).click();
  await page.getByRole("button", { name: /Carregar exemplo/i }).click();
  await page.getByLabel(/Usar material/i).check();
  await selectComboboxOption(page, "Material da tubulação", "Aço comercial");
  const frictionFactorError = page.waitForResponse(
    (response) =>
      response.url().includes("/api/flow/friction-factor") && response.status() === 400,
  );
  await page.getByRole("button", { name: /Calcular perda de carga/i }).click();
  await frictionFactorError;

  await expect(page.getByRole("table").first()).toContainText("—");
});

test("pump module surfaces an error when NPSH calculation fails", async ({ page }) => {
  await page.route("**/api/pump/headloss/methods", async (route) => {
    await route.fulfill({
      json: ["Darcy-Weisbach", "Hazen-Williams"],
    });
  });

  await page.route("**/api/piping/fittings", async (route) => {
    await route.fulfill({
      json: ["Cotovelo 90° raio longo", "Válvula gaveta"],
    });
  });

  await page.route("**/api/piping/compositions", async (route) => {
    await route.fulfill({
      json: ["Aço comercial", "PVC"],
    });
  });

  await page.route("**/api/flow/friction-factor/methods", async (route) => {
    await route.fulfill({
      json: ["ColebrookWhite", "SwameeJain"],
    });
  });

  await page.route("**/api/pump/npsh-available", async (route) => {
    await route.fulfill({
      status: 400,
      json: {
        detail: "Falha no backend de NPSH",
      },
    });
  });

  await page.route("**/api/pump/npsh-gauge/chart", async (route) => {
    await route.fulfill({
      json: {
        id: "pump-npsh-gauge",
        title: "Margem de NPSH",
        available: { value: 6.8, units: "meter" },
        required: { value: 3, units: "meter" },
        safe_threshold: { value: 3.5, units: "meter" },
        status: { tone: "safe", label: "Margem segura", message: "Folga suficiente." },
        axis: { scale: "linear", label: "NPSH", units: "m", domain: { min: 0, max: 8 }, ticks: [0, 2, 4, 6, 8], major_ticks: [0, 2, 4, 6, 8] },
        markers: [
          { id: "available", x: 6.8, y: 0, label: "NPSHd", color: "#1d4ed8" },
          { id: "required", x: 3, y: 0, label: "NPSHr", color: "#b45309" },
          { id: "safe-threshold", x: 3.5, y: 0, label: "Margem segura", color: "#16a34a" },
        ],
      },
    });
  });

  await page.goto("/pump");
  await expect(page.getByRole("heading", { name: /Perda de Carga e Bombas/i })).toBeVisible();

  await page.getByRole("tab", { name: /NPSH Disponível/i }).click();
  await page.getByRole("button", { name: /Carregar exemplo/i }).click();
  await page.getByRole("button", { name: /Calcular NPSH disponível/i }).click();

  await expect(page.locator("p.text-red-600")).toContainText(
    /Erro ao calcular NPSH disponível: Falha no backend de NPSH/i,
  );
});

test("pump module surfaces an error when pump head calculation fails", async ({ page }) => {
  await page.route("**/api/pump/headloss/methods", async (route) => {
    await route.fulfill({
      json: ["Darcy-Weisbach", "Hazen-Williams"],
    });
  });

  await page.route("**/api/piping/fittings", async (route) => {
    await route.fulfill({
      json: ["Cotovelo 90° raio longo", "Válvula gaveta"],
    });
  });

  await page.route("**/api/piping/compositions", async (route) => {
    await route.fulfill({
      json: ["Aço comercial", "PVC"],
    });
  });

  await page.route("**/api/flow/friction-factor/methods", async (route) => {
    await route.fulfill({
      json: ["ColebrookWhite", "SwameeJain"],
    });
  });

  await page.route("**/api/pump/head", async (route) => {
    await route.fulfill({
      status: 400,
      json: {
        detail: "Falha no backend de altura",
      },
    });
  });

  await page.goto("/pump");
  await expect(page.getByRole("heading", { name: /Perda de Carga e Bombas/i })).toBeVisible();

  await page.getByRole("tab", { name: /Altura Manométrica/i }).click();
  await page.getByRole("button", { name: /Carregar exemplo/i }).click();
  await page.getByRole("button", { name: /Calcular altura manométrica/i }).click();

  await expect(page.locator("p.text-red-600")).toContainText(
    /Erro ao calcular altura manométrica: Falha no backend de altura/i,
  );
});
