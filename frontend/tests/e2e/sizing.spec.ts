import { expect, test } from "@playwright/test";

async function selectComboboxOption(page, label, query) {
  const input = page.getByRole("combobox", { name: label });
  await input.fill(query);
  await input.press("Enter");
}

test("sizing module loads the example and calculates diameters", async ({
  page,
}) => {
  await page.route("**/api/piping/schedules", async (route) => {
    await route.fulfill({
      json: [
        {
          name: "SCH40",
          diameters: [125],
          description: "Schedule padrão.",
        },
      ],
    });
  });

  await page.route("**/api/sizing/calculated-diameter", async (route) => {
    await route.fulfill({
      json: { value: 126.16, units: "millimeter" },
    });
  });

  await page.route("**/api/sizing/real-diameter", async (route) => {
    await route.fulfill({
      json: { value: 150, units: "millimeter" },
    });
  });

  await page.goto("/sizing");
  await expect(page.getByRole("heading", { name: /Dimensionamento de Tubulação/i })).toBeVisible();

  await page.getByRole("button", { name: /Carregar exemplo/i }).click();
  await expect(page.getByLabel(/Vazão/i)).toHaveValue("0.0166667");
  await expect(page.getByLabel(/Velocidade de projeto/i)).toHaveValue("1.5");

  const calculatedResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/sizing/calculated-diameter") &&
      response.request().method() === "POST",
  );
  const realResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/sizing/real-diameter") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: /Calcular diâmetro/i }).click();
  await calculatedResponse;
  await realResponse;
  await expect(page.locator("table").filter({ hasText: "Diâmetro calculado" }).first()).toContainText("126,16");

  await page.getByRole("tab", { name: /Diâmetro Real/i }).click();
  await expect(page.getByLabel(/Diâmetro calculado/i)).toHaveValue("126.16");
  await page.getByRole("button", { name: /Obter diâmetro real/i }).click();
  await expect(page.locator("table").filter({ hasText: "Diâmetro real" }).first()).toContainText("150");
});

test("sizing module surfaces an error when the schedules catalog fails to load", async ({
  page,
}) => {
  await page.route("**/api/piping/schedules", async (route) => {
    await route.fulfill({
      status: 500,
      json: { detail: "Falha no backend de schedules" },
    });
  });

  await page.goto("/sizing");
  await expect(page.getByRole("heading", { name: /Dimensionamento de Tubulação/i })).toBeVisible();
  await page.getByRole("tab", { name: /Diâmetro Real/i }).click();
  await expect(page.locator("form").getByText(/Falha no backend de schedules/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Obter diâmetro real/i })).toBeDisabled();
});

test("sizing module surfaces an error when the calculated diameter request fails", async ({
  page,
}) => {
  await page.route("**/api/piping/schedules", async (route) => {
    await route.fulfill({
      json: [
        {
          name: "SCH40",
          diameters: [125],
          description: "Schedule padrão.",
        },
      ],
    });
  });

  await page.route("**/api/sizing/calculated-diameter", async (route) => {
    await route.fulfill({
      status: 400,
      json: { detail: "Falha no backend do diâmetro calculado" },
    });
  });

  await page.goto("/sizing");
  await expect(page.getByRole("heading", { name: /Dimensionamento de Tubulação/i })).toBeVisible();

  await page.getByRole("button", { name: /Carregar exemplo/i }).click();
  await page.getByRole("button", { name: /Calcular diâmetro/i }).click();

  await expect(
    page.getByText(/Falha no backend do diâmetro calculado/i),
  ).toBeVisible();
});

test("sizing module surfaces an error when the real diameter request fails", async ({
  page,
}) => {
  await page.route("**/api/piping/schedules", async (route) => {
    await route.fulfill({
      json: [
        {
          name: "SCH40",
          diameters: [125],
          description: "Schedule padrão.",
        },
      ],
    });
  });

  await page.route("**/api/sizing/calculated-diameter", async (route) => {
    await route.fulfill({
      json: { value: 126.16, units: "millimeter" },
    });
  });

  await page.route("**/api/sizing/real-diameter", async (route) => {
    await route.fulfill({
      status: 500,
      json: { detail: "Falha no backend do diâmetro real" },
    });
  });

  await page.goto("/sizing");
  await expect(page.getByRole("heading", { name: /Dimensionamento de Tubulação/i })).toBeVisible();

  await page.getByRole("button", { name: /Carregar exemplo/i }).click();
  await page.getByRole("button", { name: /Calcular diâmetro/i }).click();
  await page.getByRole("tab", { name: /Diâmetro Real/i }).click();
  await selectComboboxOption(page, "Schedule", "SCH40");
  await page.getByRole("button", { name: /Obter diâmetro real/i }).click();

  await expect(page.getByText(/Falha no backend do diâmetro real/i).first()).toBeVisible();
});
