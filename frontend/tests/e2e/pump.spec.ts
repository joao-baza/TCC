import { expect, test } from "@playwright/test";

test("pump module loads the example, calculates the main results, and shows exploratory controls", async ({
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
  await expect(page.getByLabel(/Diâmetro interno/i)).toHaveValue("100");

  await page.getByRole("button", { name: /Calcular perda de carga/i }).click();
  await expect(page.getByText(/4.25 m/i)).toBeVisible();
  await expect(page.getByText(/Perda de Carga × Vazão/i)).toBeVisible();

  await page.getByRole("button", { name: /Calcular NPSH disponível/i }).click();
  await expect(page.getByText(/6.8 m/i)).toBeVisible();
  await expect(page.getByText(/NPSHd = 6.8/i)).toBeVisible();

  await page.getByRole("button", { name: /Calcular altura manométrica/i }).click();
  await expect(page.getByText(/18.2 m/i)).toBeVisible();
  await expect(page.getByText(/Decomposição/i)).toBeVisible();

  await page.getByLabel("Modo Exploratório").selectOption("high-resistance");
  await expect(page.getByText(/Que diametro seria necessario/i)).toBeVisible();
  await expect(page.getByText(/Cota de succao/i)).toBeVisible();
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
  await page.getByRole("button", { name: /Calcular perda de carga/i }).click();

  await expect(page.getByText(/4.25 m/i)).toBeVisible();
  await expect(page.getByText(/Perda de Carga × Vazão/i)).toBeVisible();

  await page.getByLabel(/Comprimento da linha/i).fill("120");

  await expect(page.getByText(/4.25 m/i)).toHaveCount(0);
  await expect(page.getByText(/Perda de Carga × Vazão/i)).toHaveCount(0);
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

  await page.getByLabel(/Comprimento da linha/i).fill("25");
  await page.getByLabel(/Diâmetro interno/i).fill("50");
  await page.getByLabel(/Vazão/i).fill("0.005");
  await page.getByLabel(/Fator de atrito/i).fill("0.02");
  await page.getByRole("button", { name: /Calcular perda de carga/i }).click();

  await expect(page.locator("p.mt-3.text-red-600")).toHaveText(
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

  await page.getByRole("button", { name: /Carregar exemplo/i }).click();
  await page.getByLabel(/Usar material/i).check();
  await page.getByLabel(/Material da tubulação/i).selectOption("Aço comercial");
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

  await page.getByRole("button", { name: /Carregar exemplo/i }).click();
  await page.getByRole("button", { name: /Calcular NPSH disponível/i }).click();

  await expect(page.locator("p.mt-3.text-red-600")).toHaveText(
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

  await page.getByRole("button", { name: /Carregar exemplo/i }).click();
  await page.getByRole("button", { name: /Calcular altura manométrica/i }).click();

  await expect(page.locator("p.mt-3.text-red-600")).toHaveText(
    /Erro ao calcular altura manométrica: Falha no backend de altura/i,
  );
});
