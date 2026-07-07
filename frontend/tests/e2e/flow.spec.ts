import { expect, test } from "@playwright/test";

test("flow module loads the example, calculates the core values, and shows exploratory controls", async ({
  page,
}) => {
  await page.route("**/api/flow/friction-factor/methods", async (route) => {
    await route.fulfill({
      json: ["ColebrookWhite", "SwameeJain", "Haaland"],
    });
  });

  await page.route("**/api/flow/hydraulic-diameter/shapes", async (route) => {
    await route.fulfill({
      json: ["circular", "rectangular", "annular", "triangular", "circularCap"],
    });
  });

  await page.route("**/api/piping/compositions", async (route) => {
    await route.fulfill({
      json: ["Aço comercial"],
    });
  });

  await page.route("**/api/piping/schedules", async (route) => {
    await route.fulfill({
      json: [{ name: "SCH40", diameters: [50], description: "Schedule padrão." }],
    });
  });

  await page.route("**/api/piping/composition/A%C3%A7o%20comercial", async (route) => {
    await route.fulfill({
      json: {
        name: "Aço comercial",
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

  await page.getByRole("button", { name: /Carregar exemplo/i }).click();
  await expect(page.getByLabel(/Diâmetro característico/i)).toHaveValue("100");
  await expect(page.getByLabel(/Velocidade média/i)).toHaveValue("1.5");

  await page.getByRole("button", { name: /Calcular Reynolds/i }).click();
  await expect(page.getByText(/^50000 dimensionless$/i)).toBeVisible();
  await expect(page.getByText(/Regime do escoamento/i)).toBeVisible();

  await page.getByLabel(/Rugosidade/i).fill("0.045");
  await page.getByLabel(/Diâmetro da linha/i).fill("50");
  await page.getByLabel(/Método de cálculo/i).selectOption("SwameeJain");
  await page.getByRole("button", { name: /Calcular fator de atrito/i }).click();
  await expect(page.getByText(/^0.0215 dimensionless$/i)).toBeVisible();
  await expect(page.getByText(/Ponto operacional/i)).toBeVisible();

  await page.getByLabel(/Forma geométrica/i).selectOption("rectangular");
  await page.getByLabel(/Largura/i).fill("100");
  await page.getByLabel(/Altura/i).fill("50");
  await page.getByRole("button", { name: /Calcular diâmetro hidráulico/i }).click();
  await expect(page.getByText(/^66.67 millimeter$/i)).toBeVisible();

  await page.getByLabel("Modo Exploratório").selectOption("water-pvc-dn100");
  await expect(page.getByText(/Roteiro de exploração/i)).toBeVisible();
  await expect(page.getByText(/Qual velocidade leva este sistema/i)).toBeVisible();
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
      json: ["circular", "rectangular", "annular", "triangular", "circularCap"],
    });
  });

  await page.route("**/api/piping/compositions", async (route) => {
    await route.fulfill({
      json: ["Aço comercial"],
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
      json: ["circular", "rectangular", "annular", "triangular", "circularCap"],
    });
  });

  await page.route("**/api/piping/compositions", async (route) => {
    await route.fulfill({
      json: ["Aço comercial"],
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

  await page.getByLabel(/Forma geométrica/i).selectOption("rectangular");
  await page.getByLabel(/Largura/i).fill("100");
  await page.getByLabel(/Altura/i).fill("50");
  await page.getByRole("button", { name: /Calcular diâmetro hidráulico/i }).click();

  await expect(page.getByText(/Erro ao calcular diâmetro hidráulico: Falha no backend de diâmetro/i)).toBeVisible();
});

test("flow module surfaces an error when Reynolds calculation fails", async ({ page }) => {
  await page.route("**/api/flow/friction-factor/methods", async (route) => {
    await route.fulfill({
      json: ["ColebrookWhite", "SwameeJain", "Haaland"],
    });
  });

  await page.route("**/api/flow/hydraulic-diameter/shapes", async (route) => {
    await route.fulfill({
      json: ["circular", "rectangular", "annular", "triangular", "circularCap"],
    });
  });

  await page.route("**/api/piping/compositions", async (route) => {
    await route.fulfill({
      json: ["Aço comercial"],
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

  await page.getByRole("button", { name: /Carregar exemplo/i }).click();
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
      json: ["circular", "rectangular", "annular", "triangular", "circularCap"],
    });
  });

  await page.route("**/api/piping/compositions", async (route) => {
    await route.fulfill({
      json: ["Aço comercial"],
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

  await page.getByRole("button", { name: /Carregar exemplo/i }).click();
  await page.getByRole("button", { name: /Calcular Reynolds/i }).click();
  await page.getByLabel(/Número de Reynolds/i).fill("50000");
  await page.getByLabel(/Rugosidade/i).fill("0.045");
  await page.getByRole("group", { name: /Diâmetro/i }).getByLabel(/Valor customizado/i).check();
  await page.getByLabel(/Diâmetro da linha/i).fill("50");
  await page.getByLabel(/Método de cálculo/i).selectOption("SwameeJain");
  await page.getByRole("button", { name: /Calcular fator de atrito/i }).click();

  await expect(page.getByText(/Erro ao calcular fator de atrito: Falha no backend de atrito/i)).toBeVisible();
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
      json: ["circular", "rectangular", "annular", "triangular", "circularCap"],
    });
  });

  await page.route("**/api/piping/compositions", async (route) => {
    await route.fulfill({
      json: ["Aço comercial"],
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

  await page.getByRole("button", { name: /Carregar exemplo/i }).click();
  await page.getByRole("button", { name: /Calcular Reynolds/i }).click();
  await expect(page.getByText(/^50000 dimensionless$/i)).toBeVisible();

  await page.getByLabel(/Rugosidade/i).fill("0.045");
  await page.getByLabel(/Diâmetro da linha/i).fill("50");
  await page.getByLabel(/Método de cálculo/i).selectOption("SwameeJain");
  await page.getByRole("button", { name: /Calcular fator de atrito/i }).click();
  await expect(page.getByText(/^0.0215 dimensionless$/i)).toBeVisible();
  await expect(page.getByText(/Ponto operacional/i)).toBeVisible();

  await page.getByLabel(/Velocidade média/i).fill("1.8");

  await expect(page.getByText(/^50000 dimensionless$/i)).toHaveCount(0);
  await expect(page.getByText(/^0.0215 dimensionless$/i)).toHaveCount(0);
  await expect(page.getByText(/Regime do escoamento/i)).toHaveCount(0);
  await expect(page.getByText(/Ponto operacional/i)).toHaveCount(0);
  await expect(page.getByLabel(/Número de Reynolds/i)).toHaveValue("");
});

test("flow module clears friction results when the schedule changes", async ({ page }) => {
  await page.route("**/api/flow/friction-factor/methods", async (route) => {
    await route.fulfill({
      json: ["ColebrookWhite", "SwameeJain", "Haaland"],
    });
  });

  await page.route("**/api/flow/hydraulic-diameter/shapes", async (route) => {
    await route.fulfill({
      json: ["circular", "rectangular", "annular", "triangular", "circularCap"],
    });
  });

  await page.route("**/api/piping/compositions", async (route) => {
    await route.fulfill({
      json: ["Aço comercial"],
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

  await page.route("**/api/piping/composition/A%C3%A7o%20comercial", async (route) => {
    await route.fulfill({
      json: {
        name: "Aço comercial",
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
  await page.getByRole("button", { name: /Carregar exemplo/i }).click();
  await page.getByRole("button", { name: /Calcular Reynolds/i }).click();
  await page.getByLabel(/Rugosidade/i).fill("0.045");
  await page.getByRole("group", { name: /Diâmetro/i }).getByLabel(/Usar schedule/i).check();
  await page.locator("#flow-schedule").selectOption("SCH40");
  await page.getByLabel(/Diâmetro da linha/i).selectOption("60.3");
  await page.getByLabel(/Método de cálculo/i).selectOption("SwameeJain");
  await page.getByRole("button", { name: /Calcular fator de atrito/i }).click();

  await expect(page.getByText(/^0.0215 dimensionless$/i)).toBeVisible();
  await expect(page.getByText(/Ponto operacional/i)).toBeVisible();

  await page.locator("#flow-schedule").selectOption("XS");

  await expect(page.getByText(/^0.0215 dimensionless$/i)).toHaveCount(0);
  await expect(page.getByText(/Ponto operacional/i)).toHaveCount(0);
  await expect(page.getByLabel(/Diâmetro da linha/i)).toHaveValue("");
});
