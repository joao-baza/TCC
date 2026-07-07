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
      json: ["A", "B"],
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
        limiting_reagent: "A",
        outlet_concentrations: {
          A: { value: 0.4, units: "mol/L" },
          B: { value: 1.6, units: "mol/L" },
        },
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

  await expect(page.locator("#CSTR-conversion")).toHaveValue("0.8");

  const cstrResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/reactor/cstr") && response.request().method() === "POST",
  );
  await cstrCard.getByRole("button", { name: /Calcular CSTR/i }).click();
  await cstrResponse;
  await expect(cstrCard.locator("table").filter({ hasText: "Volume" }).first()).toContainText("1,23");

  await page.getByRole("tab", { name: /PFR/i }).click();
  const pfrCard = page.getByTestId("reactor-pfr-card");
  await expect(page.locator("#PFR-conversion")).toHaveValue("0.8");

  const pfrResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/reactor/pfr") && response.request().method() === "POST",
  );
  await pfrCard.getByRole("button", { name: /Calcular PFR/i }).click();
  await pfrResponse;
  await expect(pfrCard.locator("table").filter({ hasText: "Volume" }).first()).toContainText("0,91");
  await expect(page.getByTestId("pfr-profile-chart")).toBeVisible();
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
  await pfrCard.getByRole("button", { name: /Calcular PFR/i }).click();
  await expect(pfrCard.locator("table").filter({ hasText: "Volume" }).first()).toContainText("0,91");

  await page.getByRole("tab", { name: /CSTR/i }).click();
  await page.getByLabel("Conversão").fill("0.9");

  await expect(cstrCard.locator("table").filter({ hasText: "Volume" }).first()).toHaveCount(0);
  await expect(page.locator("table").filter({ hasText: "Volume" }).last()).toHaveCount(0);
});

test("reactor route surfaces a CSTR error message when the calculation fails", async ({ page }) => {
  await mockReactorPage(page, { cstrError: "Falha no backend CSTR" });
  await expect(page.getByRole("heading", { name: /Cálculos de Reator/i })).toBeVisible();

  await page.getByRole("button", { name: /Carregar exemplo/i }).click();
  const cstrCard = page.getByTestId("reactor-cstr-card");

  await cstrCard.getByRole("button", { name: /Calcular CSTR/i }).click();
  await expect(cstrCard.getByText(/Falha no backend CSTR/i)).toBeVisible();
});

test("reactor route surfaces a PFR error message when the calculation fails", async ({ page }) => {
  await mockReactorPage(page, { pfrError: "Falha no backend PFR" });
  await expect(page.getByRole("heading", { name: /Cálculos de Reator/i })).toBeVisible();

  await page.getByRole("button", { name: /Carregar exemplo/i }).click();
  await page.getByRole("tab", { name: /PFR/i }).click();
  const pfrCard = page.getByTestId("reactor-pfr-card");

  await pfrCard.getByRole("button", { name: /Calcular PFR/i }).click();
  await expect(pfrCard.getByText(/Falha no backend PFR/i)).toBeVisible();
});
