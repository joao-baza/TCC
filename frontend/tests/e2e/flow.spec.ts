import { expect, test } from "@playwright/test";

const hydraulicShapeOptions = [
  { value: "circular", label: "Circular" },
  { value: "rectangular", label: "Retangular" },
  { value: "annular", label: "Anelar" },
  { value: "triangular", label: "Triangular" },
  { value: "circularCap", label: "Canal circular" },
];

async function selectComboboxOption(page, label, query) {
  const input = page.getByRole("combobox", { name: label });
  await input.fill(query);
  await input.press("Enter");
}

test("flow module loads the example and calculates the core values", async ({
  page,
}) => {
  await page.route("**/api/flow/example", async (route) => {
    await route.fulfill({
      json: {
        reynolds: {
          characteristic_diameter: 13.843,
          velocity: 3.923,
          density: 0.65688,
          dynamic_viscosity: 0.0000111963,
        },
        friction_factor: {
          roughness: 0.15,
          diameter: 13.843,
          reynolds: 50000,
          method: "SwameeJain",
          use_composition: true,
          use_schedule: false,
          composition: "Aço galvanizado",
        },
        hydraulic_diameter: {
          shape: "circularCap",
          diameter: 0.125,
          height: 0.08333,
        },
      },
    });
  });

  await page.route("**/api/flow/friction-factor/methods", async (route) => {
    await route.fulfill({
      json: ["ColebrookWhite", "SwameeJain", "Haaland"],
    });
  });

  await page.route("**/api/flow/hydraulic-diameter/shapes", async (route) => {
    await route.fulfill({
      json: hydraulicShapeOptions,
    });
  });

  await page.route("**/api/piping/compositions", async (route) => {
    await route.fulfill({
      json: ["Aço galvanizado"],
    });
  });

  await page.route("**/api/piping/schedules", async (route) => {
    await route.fulfill({
      json: [{ name: "SCH40", diameters: [50], description: "Schedule padrão." }],
    });
  });

  await page.route("**/api/piping/composition/A%C3%A7o%20galvanizado", async (route) => {
    await route.fulfill({
      json: {
        name: "Aço galvanizado",
        description: "Tubulação de aço carbono padrão.",
        applications: "Transporte industrial.",
        specifications: {
          roughness: { value: 0.045, units: "millimeter" },
        },
      },
    });
  });

  await page.route("**/api/piping/schedule/SCH40/diameters", async (route) => {
    await route.fulfill({
      json: {
        50: { nominal_diameter: 50, external_diameter: 60.3, units: "mm" },
      },
    });
  });

  await page.route("**/api/flow/reynolds", async (route) => {
    await route.fulfill({
      json: { value: 50000, units: "dimensionless" },
    });
  });

  await page.route("**/api/flow/friction-factor", async (route) => {
    await route.fulfill({
      json: { value: 0.0215, units: "dimensionless" },
    });
  });

  await page.route("**/api/flow/hydraulic-diameter", async (route) => {
    await route.fulfill({
      json: { value: 66.67, units: "millimeter" },
    });
  });

  await page.goto("/flow");
  await expect(page.getByRole("heading", { name: /Escoamento Interno/i })).toBeVisible();

  await page.getByLabel(/Diâmetro característico/i).fill("13.843");
  await page.getByLabel(/Velocidade média/i).fill("3.923");
  await page.getByLabel(/Densidade/i).fill("0.65688");
  await page.getByLabel(/Viscosidade dinâmica/i).fill("0.0000111963");

  await page.getByRole("button", { name: /Calcular Reynolds/i }).click();
  await expect(page.locator("table").filter({ hasText: "Número de Reynolds" }).first()).toContainText("50000");
  await expect(page.getByRole("heading", { name: /^Regime do escoamento$/i })).toBeVisible();

  await page.getByRole("tab", { name: /Fator de Atrito/i }).click();
  await page.getByLabel(/Rugosidade/i).fill("0.15");
  await page.getByLabel(/Diâmetro da linha/i).fill("13.843");
  await selectComboboxOption(page, "Método de cálculo", "SwameeJain");
  await page.getByRole("button", { name: /Calcular fator de atrito/i }).click();
  await expect(page.locator("table").filter({ hasText: "Fator de atrito" }).first()).toContainText("0,0215");
  await expect(
    page.getByRole("button", { name: /Como funciona - Ponto operacional no Diagrama de Moody/i }),
  ).toBeVisible();

  await page.getByRole("tab", { name: /Diâmetro Hidráulico/i }).click();
  await selectComboboxOption(page, "Forma geométrica", "circularCap");
  await page.locator("#cap-diameter").fill("0.125");
  await page.locator("#cap-height").fill("0.08333");
  await page.getByRole("button", { name: /Calcular diâmetro hidráulico/i }).click();
  await expect(page.locator("table").filter({ hasText: "Diâmetro hidráulico" }).first()).toContainText("66,67");
});

test("flow module surfaces an error when the module bootstrap fails", async ({ page }) => {
  await page.route("**/api/flow/friction-factor/methods", async (route) => {
    await route.fulfill({
      status: 500,
      json: { detail: "Falha no bootstrap do escoamento" },
    });
  });

  await page.route("**/api/flow/hydraulic-diameter/shapes", async (route) => {
    await route.fulfill({
      json: hydraulicShapeOptions,
    });
  });

  await page.route("**/api/piping/compositions", async (route) => {
    await route.fulfill({
      json: ["Aço galvanizado"],
    });
  });

  await page.route("**/api/piping/schedules", async (route) => {
    await route.fulfill({
      json: [{ name: "SCH40", diameters: [50], description: "Schedule padrão." }],
    });
  });

  await page.goto("/flow");
  await expect(page.getByRole("heading", { name: /Escoamento Interno/i })).toBeVisible();
  await expect(page.getByText(/Falha no bootstrap do escoamento/i)).toBeVisible();
});

test("flow module surfaces an error when hydraulic diameter calculation fails", async ({ page }) => {
  await page.route("**/api/flow/friction-factor/methods", async (route) => {
    await route.fulfill({
      json: ["ColebrookWhite", "SwameeJain", "Haaland"],
    });
  });

  await page.route("**/api/flow/hydraulic-diameter/shapes", async (route) => {
    await route.fulfill({
      json: hydraulicShapeOptions,
    });
  });

  await page.route("**/api/piping/compositions", async (route) => {
    await route.fulfill({
      json: ["Aço galvanizado"],
    });
  });

  await page.route("**/api/piping/schedules", async (route) => {
    await route.fulfill({
      json: [{ name: "SCH40", diameters: [50], description: "Schedule padrão." }],
    });
  });

  await page.route("**/api/flow/hydraulic-diameter", async (route) => {
    await route.fulfill({
      status: 400,
      json: {
        detail: "Falha no backend de diâmetro",
      },
    });
  });

  await page.goto("/flow");
  await expect(page.getByRole("heading", { name: /Escoamento Interno/i })).toBeVisible();

  await page.getByRole("tab", { name: /Diâmetro Hidráulico/i }).click();
  await selectComboboxOption(page, "Forma geométrica", "rectangular");
  await page.getByLabel(/Largura/i).fill("100");
  await page.getByLabel(/Altura/i).fill("50");
  await page.getByRole("button", { name: /Calcular diâmetro hidráulico/i }).click();

  await expect(page.getByText(/Erro ao calcular diâmetro hidráulico: Falha no backend de diâmetro/i)).toBeVisible();
});

test("flow module surfaces an error when Reynolds calculation fails", async ({ page }) => {
  await page.route("**/api/flow/example", async (route) => {
    await route.fulfill({
      json: {
        reynolds: {
          characteristic_diameter: 13.843,
          velocity: 3.923,
          density: 0.65688,
          dynamic_viscosity: 0.0000111963,
        },
      },
    });
  });

  await page.route("**/api/flow/friction-factor/methods", async (route) => {
    await route.fulfill({
      json: ["ColebrookWhite", "SwameeJain", "Haaland"],
    });
  });

  await page.route("**/api/flow/hydraulic-diameter/shapes", async (route) => {
    await route.fulfill({
      json: hydraulicShapeOptions,
    });
  });

  await page.route("**/api/piping/compositions", async (route) => {
    await route.fulfill({
      json: ["Aço galvanizado"],
    });
  });

  await page.route("**/api/piping/schedules", async (route) => {
    await route.fulfill({
      json: [{ name: "SCH40", diameters: [50], description: "Schedule padrão." }],
    });
  });

  await page.route("**/api/flow/reynolds", async (route) => {
    await route.fulfill({
      status: 400,
      json: {
        detail: "Falha no backend de Reynolds",
      },
    });
  });

  await page.goto("/flow");
  await expect(page.getByRole("heading", { name: /Escoamento Interno/i })).toBeVisible();

  await page.getByLabel(/Diâmetro característico/i).fill("13.843");
  await page.getByLabel(/Velocidade média/i).fill("3.923");
  await page.getByLabel(/Densidade/i).fill("0.65688");
  await page.getByLabel(/Viscosidade dinâmica/i).fill("0.0000111963");
  await page.getByRole("button", { name: /Calcular Reynolds/i }).click();

  await expect(page.getByText(/Erro ao calcular Reynolds: Falha no backend de Reynolds/i)).toBeVisible();
});

test("flow module surfaces an error when friction factor calculation fails", async ({ page }) => {
  await page.route("**/api/flow/friction-factor/methods", async (route) => {
    await route.fulfill({
      json: ["ColebrookWhite", "SwameeJain", "Haaland"],
    });
  });

  await page.route("**/api/flow/hydraulic-diameter/shapes", async (route) => {
    await route.fulfill({
      json: hydraulicShapeOptions,
    });
  });

  await page.route("**/api/piping/compositions", async (route) => {
    await route.fulfill({
      json: ["Aço galvanizado"],
    });
  });

  await page.route("**/api/piping/schedules", async (route) => {
    await route.fulfill({
      json: [{ name: "SCH40", diameters: [50], description: "Schedule padrão." }],
    });
  });

  await page.route("**/api/flow/reynolds", async (route) => {
    await route.fulfill({
      json: { value: 50000, units: "dimensionless" },
    });
  });

  await page.route("**/api/flow/friction-factor", async (route) => {
    await route.fulfill({
      status: 400,
      json: {
        detail: "Falha no backend de atrito",
      },
    });
  });

  await page.goto("/flow");
  await expect(page.getByRole("heading", { name: /Escoamento Interno/i })).toBeVisible();

  await page.getByLabel(/Diâmetro característico/i).fill("13.843");
  await page.getByLabel(/Velocidade média/i).fill("3.923");
  await page.getByLabel(/Densidade/i).fill("0.65688");
  await page.getByLabel(/Viscosidade dinâmica/i).fill("0.0000111963");
  await page.getByRole("button", { name: /Calcular Reynolds/i }).click();
  await page.getByRole("tab", { name: /Fator de Atrito/i }).click();
  await page.getByRole("group", { name: /Rugosidade/i }).getByLabel(/Valor customizado/i).check();
  await page.getByLabel(/Rugosidade/i).fill("0.045");
  await page.getByLabel(/Diâmetro da linha/i).fill("50");
  await selectComboboxOption(page, "Método de cálculo", "SwameeJain");
  await page.getByRole("button", { name: /Calcular fator de atrito/i }).click();

  await expect(
    page.getByText(/Erro ao calcular fator de atrito: Falha no backend de atrito/i).first(),
  ).toBeVisible();
});

test("flow module clears stale Reynolds and friction outputs after dependent edits", async ({
  page,
}) => {
  await page.route("**/api/flow/friction-factor/methods", async (route) => {
    await route.fulfill({
      json: ["ColebrookWhite", "SwameeJain", "Haaland"],
    });
  });

  await page.route("**/api/flow/hydraulic-diameter/shapes", async (route) => {
    await route.fulfill({
      json: hydraulicShapeOptions,
    });
  });

  await page.route("**/api/piping/compositions", async (route) => {
    await route.fulfill({
      json: ["Aço galvanizado"],
    });
  });

  await page.route("**/api/piping/schedules", async (route) => {
    await route.fulfill({
      json: [{ name: "SCH40", diameters: [50], description: "Schedule padrão." }],
    });
  });

  await page.route("**/api/flow/reynolds", async (route) => {
    await route.fulfill({
      json: { value: 50000, units: "dimensionless" },
    });
  });

  await page.route("**/api/flow/friction-factor", async (route) => {
    await route.fulfill({
      json: { value: 0.0215, units: "dimensionless" },
    });
  });

  await page.goto("/flow");
  await expect(page.getByRole("heading", { name: /Escoamento Interno/i })).toBeVisible();

  await page.getByLabel(/Diâmetro característico/i).fill("13.843");
  await page.getByLabel(/Velocidade média/i).fill("3.923");
  await page.getByLabel(/Densidade/i).fill("0.65688");
  await page.getByLabel(/Viscosidade dinâmica/i).fill("0.0000111963");
  await page.getByRole("button", { name: /Calcular Reynolds/i }).click();
  await expect(page.locator("table").filter({ hasText: "Número de Reynolds" }).first()).toContainText("50000");

  await page.getByRole("tab", { name: /Fator de Atrito/i }).click();
  await page.getByRole("group", { name: /Rugosidade/i }).getByLabel(/Valor customizado/i).check();
  await page.getByLabel(/Rugosidade/i).fill("0.045");
  await page.getByLabel(/Diâmetro da linha/i).fill("50");
  await selectComboboxOption(page, "Método de cálculo", "SwameeJain");
  await page.getByRole("button", { name: /Calcular fator de atrito/i }).click();
  await expect(page.locator("table").filter({ hasText: "Fator de atrito" }).first()).toContainText("0,0215");
  await expect(
    page.getByRole("button", { name: /Como funciona - Ponto operacional no Diagrama de Moody/i }),
  ).toBeVisible();

  await page.getByRole("tab", { name: /Número de Reynolds/i }).click();
  await page.getByLabel(/Velocidade média/i).fill("1.8");

  const reynoldsTable = page.locator("table").filter({ hasText: "Número de Reynolds" }).first();
  const frictionTable = page.locator("table").filter({ hasText: "Fator de atrito" }).first();

  await expect(reynoldsTable).toContainText("—");
  await expect(frictionTable).toHaveCount(0);
  await expect(reynoldsTable).not.toContainText("50000");
  await expect(page.getByRole("heading", { name: /^Regime do escoamento$/i })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Como funciona - Ponto operacional no Diagrama de Moody/i }),
  ).toHaveCount(0);
  await expect(page.getByLabel(/Número de Reynolds/i)).toHaveCount(0);
});

test("flow module clears friction results when the schedule changes", async ({ page }) => {
  await page.route("**/api/flow/friction-factor/methods", async (route) => {
    await route.fulfill({
      json: ["ColebrookWhite", "SwameeJain", "Haaland"],
    });
  });

  await page.route("**/api/flow/hydraulic-diameter/shapes", async (route) => {
    await route.fulfill({
      json: hydraulicShapeOptions,
    });
  });

  await page.route("**/api/piping/compositions", async (route) => {
    await route.fulfill({
      json: ["Aço galvanizado"],
    });
  });

  await page.route("**/api/piping/schedules", async (route) => {
    await route.fulfill({
      json: [
        { name: "SCH40", diameters: [50], description: "Schedule padrão." },
        { name: "XS", diameters: [50], description: "Schedule extra strong." },
      ],
    });
  });

  await page.route("**/api/piping/composition/A%C3%A7o%20galvanizado", async (route) => {
    await route.fulfill({
      json: {
        name: "Aço galvanizado",
        description: "Tubulação de aço carbono padrão.",
        applications: "Transporte industrial.",
        specifications: {
          roughness: { value: 0.045, units: "millimeter" },
        },
      },
    });
  });

  await page.route("**/api/piping/schedule/SCH40/diameters", async (route) => {
    await route.fulfill({
      json: {
        50: { nominal_diameter: 50, external_diameter: 60.3, units: "mm" },
      },
    });
  });

  await page.route("**/api/piping/schedule/XS/diameters", async (route) => {
    await route.fulfill({
      json: {
        50: { nominal_diameter: 50, external_diameter: 60.7, units: "mm" },
      },
    });
  });

  await page.route("**/api/flow/reynolds", async (route) => {
    await route.fulfill({
      json: { value: 50000, units: "dimensionless" },
    });
  });

  await page.route("**/api/flow/friction-factor", async (route) => {
    await route.fulfill({
      json: { value: 0.0215, units: "dimensionless" },
    });
  });

  await page.goto("/flow");
  await page.getByLabel(/Diâmetro característico/i).fill("13.843");
  await page.getByLabel(/Velocidade média/i).fill("3.923");
  await page.getByLabel(/Densidade/i).fill("0.65688");
  await page.getByLabel(/Viscosidade dinâmica/i).fill("0.0000111963");
  await page.getByRole("button", { name: /Calcular Reynolds/i }).click();
  await page.getByRole("tab", { name: /Fator de Atrito/i }).click();
  await page.getByRole("group", { name: /Rugosidade/i }).getByLabel(/Usar composição/i).check();
  await selectComboboxOption(page, "Material da tubulação", "Aço galvanizado");
  await page.getByRole("group", { name: /Diâmetro/i }).getByLabel(/Usar schedule/i).check();
  await selectComboboxOption(page, "Schedule", "SCH40");
  await expect(page.getByRole("combobox", { name: /Diâmetro da linha/i })).toBeEnabled();
  await selectComboboxOption(page, "Diâmetro da linha", "60.3");
  await selectComboboxOption(page, "Método de cálculo", "SwameeJain");
  await page.getByRole("button", { name: /Calcular fator de atrito/i }).click();

  await expect(page.locator("table").filter({ hasText: "Fator de atrito" }).first()).toContainText("0,0215");
  await expect(
    page.getByRole("button", { name: /Como funciona - Ponto operacional no Diagrama de Moody/i }),
  ).toBeVisible();

  const scheduleInput = page.getByRole("combobox", { name: "Schedule" });
  await scheduleInput.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type("XS");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("combobox", { name: "Schedule" })).toHaveValue("XS");
  await expect(
    page.getByRole("button", { name: /Como funciona - Ponto operacional no Diagrama de Moody/i }),
  ).toHaveCount(0);
});
