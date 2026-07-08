import { expect, test } from "@playwright/test";

test("piping module loads catalogs and shows composition, diameter, and fitting details", async ({
  page,
}) => {
  await page.route("**/api/piping/compositions", async (route) => {
    await route.fulfill({
      json: ["Aço comercial"],
    });
  });

  await page.route("**/api/piping/schedules", async (route) => {
    await route.fulfill({
      json: [
        { name: "SCH40", diameters: [25], description: "Schedule padrão." },
      ],
    });
  });

  await page.route("**/api/piping/fittings", async (route) => {
    await route.fulfill({
      json: ["Cotovelo 90° raio longo"],
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
          roughness_coefficient: { value: 130, units: "dimensionless" },
        },
      },
    });
  });

  await page.route("**/api/piping/schedule/SCH40/diameters", async (route) => {
    await route.fulfill({
      json: {
        25: { nominal_diameter: 25, external_diameter: 33.4, units: "mm" },
      },
    });
  });

  await page.route("**/api/piping/schedule/SCH40/diameter/25", async (route) => {
    await route.fulfill({
      json: {
        external_diameter: { value: 33.4, units: "millimeter" },
        thickness: { value: 3.38, units: "millimeter" },
        weight: { value: 2.5, units: "kilogram / meter" },
        max_pressure: { value: 1013250, units: "pascal" },
      },
    });
  });

  await page.route("**/api/piping/fitting/Cotovelo%2090%C2%B0%20raio%20longo", async (route) => {
    await route.fulfill({
      json: {
        name: "Cotovelo 90° raio longo",
        description: "Cotovelo de grande raio.",
        usage: "Mudança de direção com menor perda.",
        specifications: {
          equivalentLength: { value: 30, units: "dimensionless" },
        },
      },
    });
  });

  await page.goto("/piping");
  await expect(page.getByRole("heading", { name: /Tubulações e Acessórios/i })).toBeVisible();

  const compositionInput = page.getByRole("combobox", { name: "Composição" });
  await compositionInput.fill("Aço comercial");
  await compositionInput.press("Enter");
  const compositionTable = page.locator("table").filter({ hasText: "Roughness" }).first();
  await expect(compositionTable).toBeVisible();
  await expect(compositionTable).toContainText("Tubulação de aço carbono padrão");
  await expect(compositionTable).toContainText("0,045");
  await expect(compositionTable).toContainText("mm");
  await expect(compositionTable).toContainText("130");

  await page.getByRole("tab", { name: /Schedules e Diâmetros/i }).click();
  const scheduleInput = page.getByRole("combobox", { name: "Schedule" });
  await scheduleInput.fill("SCH40");
  await scheduleInput.press("Enter");
  const diameterInput = page.getByRole("combobox", { name: /Diâmetro nominal/i });
  await diameterInput.fill("25");
  await diameterInput.press("Enter");
  const diameterTable = page.locator("table").filter({ hasText: "External Diameter" }).first();
  await expect(diameterTable).toBeVisible();
  await expect(diameterTable).toContainText("33,4");
  await expect(diameterTable).toContainText("3,38");
  await expect(diameterTable).toContainText("2,5");
  await expect(diameterTable).toContainText("kg/m");

  await page.getByRole("tab", { name: /Conexões/i }).click();
  const fittingInput = page.getByRole("combobox", { name: "Conexão" });
  await fittingInput.fill("Cotovelo 90° raio longo");
  await fittingInput.press("Enter");
  const fittingTable = page.locator("table").filter({ hasText: "Equivalent Length" }).first();
  await expect(fittingTable).toBeVisible();
  await expect(fittingTable).toContainText("Mudança de direção com menor perda");
  await expect(fittingTable).toContainText("30");
  await expect(fittingTable).toContainText("-");
});

test("piping module surfaces an error when the catalog bootstrap fails", async ({ page }) => {
  await page.route("**/api/piping/compositions", async (route) => {
    await route.fulfill({
      json: ["Aço comercial"],
    });
  });

  await page.route("**/api/piping/schedules", async (route) => {
    await route.fulfill({
      status: 500,
      json: { detail: "Falha no backend dos schedules" },
    });
  });

  await page.route("**/api/piping/fittings", async (route) => {
    await route.fulfill({
      json: ["Cotovelo 90° raio longo"],
    });
  });

  await page.goto("/piping");
  await expect(page.getByRole("heading", { name: /Tubulações e Acessórios/i })).toBeVisible();
  await expect(page.getByText(/Falha no backend dos schedules/i)).toBeVisible();
});

test("piping module surfaces an error when composition details fail to load", async ({
  page,
}) => {
  await page.route("**/api/piping/compositions", async (route) => {
    await route.fulfill({
      json: ["Aço comercial"],
    });
  });

  await page.route("**/api/piping/schedules", async (route) => {
    await route.fulfill({
      json: [{ name: "SCH40", diameters: [25], description: "Schedule padrão." }],
    });
  });

  await page.route("**/api/piping/fittings", async (route) => {
    await route.fulfill({
      json: ["Cotovelo 90° raio longo"],
    });
  });

  await page.route("**/api/piping/composition/A%C3%A7o%20comercial", async (route) => {
    await route.fulfill({
      status: 400,
      json: { detail: "Falha no backend da composição" },
    });
  });

  await page.goto("/piping");
  await expect(page.getByRole("heading", { name: /Tubulações e Acessórios/i })).toBeVisible();

  const compositionInput = page.getByRole("combobox", { name: "Composição" });
  await compositionInput.fill("Aço comercial");
  await compositionInput.press("Enter");
  await expect(page.getByText(/Falha no backend da composição/i)).toBeVisible();
});

test("piping module clears the diameter details when the schedule changes", async ({
  page,
}) => {
  await page.route("**/api/piping/compositions", async (route) => {
    await route.fulfill({
      json: ["Aço comercial"],
    });
  });

  await page.route("**/api/piping/schedules", async (route) => {
    await route.fulfill({
      json: [
        { name: "SCH40", diameters: [25], description: "Schedule padrão." },
        { name: "XS", diameters: [25], description: "Extra strong." },
      ],
    });
  });

  await page.route("**/api/piping/fittings", async (route) => {
    await route.fulfill({
      json: ["Cotovelo 90° raio longo"],
    });
  });

  await page.route("**/api/piping/schedule/SCH40/diameters", async (route) => {
    await route.fulfill({
      json: {
        25: { nominal_diameter: 25, external_diameter: 33.4, units: "mm" },
      },
    });
  });

  await page.route("**/api/piping/schedule/SCH40/diameter/25", async (route) => {
    await route.fulfill({
      json: {
        external_diameter: { value: 33.4, units: "millimeter" },
        thickness: { value: 3.38, units: "millimeter" },
        weight: { value: 2.5, units: "kilogram / meter" },
        max_pressure: { value: 1013250, units: "pascal" },
      },
    });
  });

  await page.route("**/api/piping/schedule/XS/diameters", async (route) => {
    await route.fulfill({
      json: {
        25: { nominal_diameter: 25, external_diameter: 33.7, units: "mm" },
      },
    });
  });

  await page.goto("/piping");
  await page.getByRole("tab", { name: /Schedules e Diâmetros/i }).click();
  const scheduleInput = page.getByRole("combobox", { name: "Schedule" });
  await scheduleInput.fill("SCH40");
  await scheduleInput.press("Enter");
  const diameterInput = page.getByRole("combobox", { name: /Diâmetro nominal/i });
  await diameterInput.fill("25");
  await diameterInput.press("Enter");

  await expect(page.locator("table").filter({ hasText: "External Diameter" }).first()).toBeVisible();

  await expect(page.getByText(/Schedule padrão/i)).toBeVisible();
});

test("piping module ignores delayed composition details after the selection changes", async ({
  page,
}) => {
  let resolveComposition: ((value: unknown) => void) | undefined;

  await page.route("**/api/piping/compositions", async (route) => {
    await route.fulfill({
      json: ["Aço comercial", "PVC"],
    });
  });

  await page.route("**/api/piping/schedules", async (route) => {
    await route.fulfill({
      json: [{ name: "SCH40", diameters: [25], description: "Schedule padrão." }],
    });
  });

  await page.route("**/api/piping/fittings", async (route) => {
    await route.fulfill({
      json: ["Cotovelo 90° raio longo"],
    });
  });

  await page.route("**/api/piping/composition/A%C3%A7o%20comercial", async (route) => {
    await new Promise<void>((resolve) => {
      resolveComposition = (value) => {
        void route.fulfill({ json: value });
        resolve();
      };
    });
  });

  await page.route("**/api/piping/composition/PVC", async (route) => {
    await route.fulfill({
      json: {
        name: "PVC",
        description: "Tubo de PVC.",
        applications: "Água e efluentes.",
        specifications: {
          roughness: { value: 0.0015, units: "millimeter" },
        },
      },
    });
  });

  await page.goto("/piping");
  await expect(page.getByRole("heading", { name: /Tubulações e Acessórios/i })).toBeVisible();

  const compositionInput = page.getByRole("combobox", { name: "Composição" });
  await compositionInput.fill("Aço comercial");
  await compositionInput.press("Enter");
  await compositionInput.fill("PVC");
  await compositionInput.press("Enter");

  resolveComposition?.({
    name: "Aço comercial",
    description: "Tubulação de aço carbono padrão.",
    applications: "Transporte industrial.",
    specifications: {
      roughness: { value: 0.045, units: "millimeter" },
      roughness_coefficient: { value: 130, units: "dimensionless" },
    },
  });

  const pvcTable = page.locator("table").filter({ hasText: "PVC" }).first();
  await expect(pvcTable).toBeVisible();
  await expect(pvcTable).toContainText("Tubo de PVC");
  await expect(pvcTable).toContainText("0");
  await expect(pvcTable).toContainText("mm");
  await expect(page.locator("table").filter({ hasText: "Tubulação de aço carbono padrão" })).toHaveCount(0);
  await expect(page.locator("table").filter({ hasText: "0,045" })).toHaveCount(0);
});

test("piping module surfaces an error when schedule diameters fail to load", async ({
  page,
}) => {
  await page.route("**/api/piping/compositions", async (route) => {
    await route.fulfill({
      json: ["Aço comercial"],
    });
  });

  await page.route("**/api/piping/schedules", async (route) => {
    await route.fulfill({
      json: [
        { name: "SCH40", diameters: [25], description: "Schedule padrão." },
      ],
    });
  });

  await page.route("**/api/piping/fittings", async (route) => {
    await route.fulfill({
      json: ["Cotovelo 90° raio longo"],
    });
  });

  await page.route("**/api/piping/schedule/SCH40/diameters", async (route) => {
    await route.fulfill({
      status: 500,
      json: { detail: "Falha no backend dos diâmetros" },
    });
  });

  await page.goto("/piping");
  await expect(page.getByRole("heading", { name: /Tubulações e Acessórios/i })).toBeVisible();

  await page.getByRole("tab", { name: /Schedules e Diâmetros/i }).click();
  const scheduleInput = page.getByRole("combobox", { name: "Schedule" });
  await scheduleInput.fill("SCH40");
  await scheduleInput.press("Enter");
  await expect(page.getByText(/Falha no backend dos diâmetros/i)).toBeVisible();
});
