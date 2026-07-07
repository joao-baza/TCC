import { expect, test } from "@playwright/test";

async function selectComboboxOption(page, label, query) {
  const input = page.getByRole("combobox", { name: label });
  await input.fill(query);
  await input.press("Enter");
}

test("pump module loads the example and calculates the main results", async ({
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

  await page.route("**/api/pump/npsh-available", async (route) => {
    await route.fulfill({
      json: {
        head_loss: { value: 6.8, units: "meter" },
      },
    });
  });

  await page.route("**/api/pump/head", async (route) => {
    await route.fulfill({
      json: { value: 18.2, units: "meter" },
    });
  });

  await page.goto("/pump");
  await expect(page.getByRole("heading", { name: /Perda de Carga e Bombas/i })).toBeVisible();

  await page.getByRole("button", { name: /Carregar exemplo/i }).click();
  await expect(page.getByLabel(/Comprimento da linha/i)).toHaveValue("100");
  await expect(page.getByLabel(/Diâmetro interno/i)).toHaveValue("125");
  await expect(page.getByLabel(/Vazão/i)).toHaveValue("0.04");
  await expect(page.getByLabel(/Velocidade na linha/i)).toHaveValue("3.259493234522017");
  await expect(page.getByLabel(/Número de Reynolds/i)).toHaveValue("3186.1046722863807");
  await expect(page.getByLabel(/Material da tubulação/i)).toHaveValue("Aço galvanizado");

  await page.getByLabel(/Usar fator informado/i).click();
  await expect(page.getByLabel(/Fator de atrito/i)).toHaveValue("0.04495094389484752");

  await page.getByRole("button", { name: /Calcular perda de carga/i }).click();
  const headlossTable = page.locator("table").filter({ hasText: "Perda de carga" }).first();
  await expect(headlossTable).toBeVisible();
  await expect(headlossTable).toContainText("4,25");
  await expect(page.getByText(/Perda de Carga × Vazão/i)).toBeVisible();

  await page.getByRole("tab", { name: /NPSH Disponível/i }).click();
  await page.getByRole("button", { name: /Calcular NPSH disponível/i }).click();
  await expect(page.getByText(/6,8 m/i)).toBeVisible();
  await expect(page.getByText(/NPSHd = 6,8/i)).toBeVisible();

  await page.getByRole("tab", { name: /Altura Manométrica/i }).click();
  await page.getByRole("button", { name: /Calcular altura manométrica/i }).click();
  await expect(page.getByText(/18,2 m/i)).toBeVisible();
  await expect(page.getByText(/Decomposição/i)).toBeVisible();
});

test("pump module clears headloss results after the base inputs change", async ({ page }) => {
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

  await page.goto("/pump");
  await page.getByRole("button", { name: /Carregar exemplo/i }).click();
  await page.getByRole("tab", { name: /Perda de Carga/i }).click();
  await page.getByRole("button", { name: /Calcular perda de carga/i }).click();

  const headlossTable = page.locator("table").filter({ hasText: "Perda de carga" }).first();
  await expect(headlossTable).toBeVisible();
  await expect(headlossTable).toContainText("4,25");
  await expect(page.getByText(/Perda de Carga × Vazão/i)).toBeVisible();

  await page.getByLabel(/Comprimento da linha/i).fill("120");

  await expect(headlossTable).toContainText("—");
  await expect(headlossTable).not.toContainText("4,25");
  await expect(page.getByRole("heading", { name: /Perda de Carga × Vazão/i })).toHaveCount(0);
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
