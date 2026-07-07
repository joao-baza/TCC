import { expect, test } from "@playwright/test";

test("sizing module loads the example, calculates diameters, and shows exploratory controls", async ({
  page,
}) => {
  await page.route("**/api/piping/schedules", async (route) => {
    await route.fulfill({
      json: [
        {
          name: "STD",
          diameters: [25, 40],
          description: "Schedule padrao",
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
  await expect(page.getByLabel(/Vazão/i)).toHaveValue("0.01");
  await expect(page.getByLabel(/Velocidade de projeto/i)).toHaveValue("1.5");

  await page.getByRole("button", { name: /Calcular diâmetro/i }).click();
  await expect(page.getByText(/126.16 mm/i)).toBeVisible();
  await expect(page.getByLabel(/Diâmetro calculado/i)).toHaveValue("126.16");

  await page.getByLabel(/Schedule/i).selectOption("STD");
  await page.getByRole("button", { name: /Obter diâmetro real/i }).click();
  await expect(page.getByText(/150 mm/i)).toBeVisible();

  await page.getByLabel("Modo Exploratório").selectOption("process-line");
  await expect(page.getByText(/Roteiro de exploração/i)).toBeVisible();
  await expect(page.getByText(/Qual e a maior vazao/i)).toBeVisible();
  await expect(page.getByText(/Perfil ao vivo/i)).toBeVisible();
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
          name: "STD",
          diameters: [25, 40],
          description: "Schedule padrao",
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
          name: "STD",
          diameters: [25, 40],
          description: "Schedule padrao",
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
  await page.getByLabel(/Schedule/i).selectOption("STD");
  await page.getByRole("button", { name: /Obter diâmetro real/i }).click();

  await expect(page.getByText(/Falha no backend do diâmetro real/i).first()).toBeVisible();
});
