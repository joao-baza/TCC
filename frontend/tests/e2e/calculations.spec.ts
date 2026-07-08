import { expect, test, type Page } from "@playwright/test";

async function mockReactorPage(
  page: Page,
  options?: { bootstrapError?: string; cstrError?: string; pfrError?: string },
) {
  await page.route("**/api/reactor/cstr/calculation-types", async (route) => {
    if (options?.bootstrapError) {
      await route.fulfill({
        status: 500,
        json: { detail: options.bootstrapError },
      });
      return;
    }

    await route.fulfill({
      json: ["conversion_and_kinetics", "volume_and_kinetics"],
    });
  });

  await page.route("**/api/reactor/pfr/calculation-types", async (route) => {
    await route.fulfill({
      json: [
        "conversion_and_kinetics",
        "volume_and_kinetics",
        "residence_time_and_kinetics",
      ],
    });
  });

  await page.route("**/api/components/list", async (route) => {
    if (options?.bootstrapError) {
      await route.fulfill({
        status: 500,
        json: { detail: options.bootstrapError },
      });
      return;
    }

    await route.fulfill({
      json: ["Water", "Ethanol"],
    });
  });

  await page.route("**/api/reactor/cstr", async (route) => {
    if (options?.cstrError) {
      await route.fulfill({
        status: 400,
        json: { detail: options.cstrError },
      });
      return;
    }

    await route.fulfill({
      json: {
        volume: { value: 1.23, units: "m³" },
        conversion: 0.65,
        limiting_reagent: "A",
      },
    });
  });

  await page.route("**/api/reactor/pfr", async (route) => {
    if (options?.pfrError) {
      await route.fulfill({
        status: 400,
        json: { detail: options.pfrError },
      });
      return;
    }

    await route.fulfill({
      json: {
        volume: { value: 0.91, units: "m³" },
        conversion: 0.8,
        limiting_reagent: "Water",
        outlet_concentrations: {
          Water: { value: 1000, units: "mol/m³" },
          Ethanol: { value: 4000, units: "mol/m³" },
        },
      },
    });
  });

  await page.route("**/api/reactor/arrhenius/chart", async (route) => {
    await route.fulfill({
      json: {
        id: "reactor-arrhenius-chart",
        title: "Arrhenius",
        subtitle: "Curva semilog de Arrhenius: 1000 / T versus ln(k).",
        axes: {
          x: {
            scale: "linear",
            label: "1000 / T",
            units: "10^3 K^-1",
            domain: { min: 2.4, max: 3.4 },
            ticks: [2.4, 2.8, 3.2, 3.4],
            major_ticks: [2.4, 2.8, 3.2, 3.4],
          },
          y: {
            scale: "linear",
            label: "ln(k)",
            units: "adimensional",
            domain: { min: -2, max: 1 },
            ticks: [-2, -1, 0, 1],
            major_ticks: [-2, -1, 0, 1],
          },
        },
        series: [
          {
            id: "arrhenius-curve",
            name: "Curva de Arrhenius",
            kind: "line",
            color: "#0f766e",
            points: [
              { x: 2.4, y: 0.9 },
              { x: 2.8, y: 0.2 },
              { x: 3.2, y: -0.8 },
            ],
          },
        ],
        markers: [
          { id: "reference-point", x: 2.85, y: -0.69, label: "Ponto de referência", color: "#dc2626" },
        ],
        annotations: [],
        metadata: { version: "1.0", units: { x: "10^3 K^-1", y: "adimensional" } },
      },
    });
  });

  await page.goto("/reactor");
}

test("reactor route calculates CSTR and PFR results", async ({ page }) => {
  await mockReactorPage(page);
  await expect(page.getByRole("heading", { name: /Cálculos de Reator/i })).toBeVisible();
  await page.getByRole("button", { name: /Carregar exemplo/i }).click();
  const cstrCard = page.getByTestId("reactor-cstr-card");

  await expect(page.locator("#CSTR-volume")).toHaveValue("3.0");

  const cstrResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/reactor/cstr") && response.request().method() === "POST",
  );
  await cstrCard.getByRole("button", { name: /Calcular CSTR/i }).click();
  await cstrResponse;
  await expect(cstrCard.locator("table").filter({ hasText: "Volume" }).first()).toContainText("1,23");

  await page.getByRole("tab", { name: /PFR/i }).click();
  const pfrCard = page.getByTestId("reactor-pfr-card");
  await expect(page.locator("#PFR-volume")).toHaveValue("3.0");
  await expect(pfrCard.locator("table").filter({ hasText: "Volume" }).first()).toContainText("0,91");
});

test("reactor route shows the Arrhenius chart", async ({ page }) => {
  await mockReactorPage(page);
  await expect(page.getByRole("heading", { name: /Cálculos de Reator/i })).toBeVisible();

  await page.getByRole("button", { name: /Carregar exemplo/i }).click();
  await page.getByRole("tab", { name: /Arrhenius/i }).click();

  await expect(page.getByTestId("arrhenius-plot")).toBeVisible();
  await expect(page.getByRole("img", { name: /Arrhenius/i })).toBeVisible();
});

test("reactor route surfaces a bootstrap error when the module fails to load", async ({
  page,
}) => {
  await mockReactorPage(page, { bootstrapError: "Falha no backend do reator" });

  await expect(page.getByRole("heading", { name: /Cálculos de Reator/i })).toBeVisible();
  await expect(page.getByText(/Falha no backend do reator/i)).toBeVisible();
});

test("reactor route clears calculated results after editing the conversion input", async ({
  page,
}) => {
  await mockReactorPage(page);
  await expect(page.getByRole("heading", { name: /Cálculos de Reator/i })).toBeVisible();

  await page.getByRole("button", { name: /Carregar exemplo/i }).click();

  const cstrCard = page.getByTestId("reactor-cstr-card");

  await cstrCard.getByRole("button", { name: /Calcular CSTR/i }).click();

  await expect(cstrCard.locator("table").filter({ hasText: "Volume" }).first()).toContainText("1,23");

  await page.getByRole("tab", { name: /PFR/i }).click();
  const pfrCard = page.getByTestId("reactor-pfr-card");
  await expect(pfrCard.locator("table").filter({ hasText: "Volume" }).first()).toContainText("0,91");

  await page.getByRole("tab", { name: /CSTR/i }).click();
  await page.getByLabel(/Volume do reator/i).fill("4");

  await expect(cstrCard.locator("table").filter({ hasText: "Volume" }).first()).toHaveCount(0);
  await expect(page.locator("table").filter({ hasText: "Volume" }).last()).toHaveCount(0);
});

test("reactor route surfaces a CSTR error message when the calculation fails", async ({ page }) => {
  await mockReactorPage(page, { cstrError: "Falha no backend CSTR" });
  await expect(page.getByRole("heading", { name: /Cálculos de Reator/i })).toBeVisible();

  await page.getByRole("button", { name: /Carregar exemplo/i }).click();
  const cstrCard = page.getByTestId("reactor-cstr-card");

  await cstrCard.getByRole("button", { name: /Calcular CSTR/i }).click();
  await expect(cstrCard.getByRole("alert")).toContainText(/Falha no backend CSTR/i);
});

test("reactor route surfaces a PFR error message when the calculation fails", async ({ page }) => {
  await mockReactorPage(page, { pfrError: "Falha no backend PFR" });
  await expect(page.getByRole("heading", { name: /Cálculos de Reator/i })).toBeVisible();

  await page.getByRole("button", { name: /Carregar exemplo/i }).click();
  await page.getByRole("tab", { name: /PFR/i }).click();
  const pfrCard = page.getByTestId("reactor-pfr-card");

  await pfrCard.getByRole("button", { name: /Calcular PFR/i }).click();
  await expect(pfrCard.getByRole("alert")).toContainText(/Falha no backend PFR/i);
});
