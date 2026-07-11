import { expect, test, type Page } from "@playwright/test";

async function selectComboboxOption(page: Page, label: string, query: string) {
  const input = page.getByRole("combobox", { name: label });
  await input.fill(query);
  await input.press("Enter");
}

test("components module loads catalogs and calculates critical, pure, and mixture properties", async ({
  page,
}) => {
  await page.route("**/api/components/list", async (route) => {
    await route.fulfill({
      json: ["Water", "Ethanol", "Propane"],
    });
  });

  await page.route("**/api/components/property-names", async (route) => {
    await route.fulfill({
      json: {
        D: "Massa específica [kg/m³]",
        V: "Viscosity [Pa·s]",
      },
    });
  });

  await page.route("**/api/components/property-mixture-names", async (route) => {
    await route.fulfill({
      json: {
        D: "Massa específica [kg/m³]",
        Z: "Compressibility factor [-]",
      },
    });
  });

  await page.route("**/api/components/critical-properties", async (route) => {
    await route.fulfill({
      json: {
        critical_temperature: 647.1,
        critical_temperature_units: "kelvin",
        critical_pressure: 22064000,
        critical_pressure_units: "pascal",
        critical_density: 322,
        critical_density_units: "kilogram / meter ** 3",
        triple_point_temperature: 273.16,
        triple_point_temperature_units: "kelvin",
        triple_point_pressure: 611.657,
        triple_point_pressure_units: "pascal",
      },
    });
  });

  await page.route("**/api/components/property", async (route) => {
    const body = route.request().postDataJSON() as { property_name?: string };

    if (body.property_name === "D") {
      await route.fulfill({ json: { value: 997, units: "kilogram / meter ** 3" } });
      return;
    }

    if (body.property_name === "V") {
      await route.fulfill({ json: { value: 0.00089, units: "pascal * second" } });
      return;
    }

    await route.fulfill({ json: { value: 1, units: "" } });
  });

  await page.route("**/api/components/mixture-properties", async (route) => {
    await route.fulfill({
      json: {
        properties: {
          D: { value: 812.5, units: "kilogram / meter ** 3" },
          Z: { value: 0.98, units: "dimensionless" },
        },
      },
    });
  });

  await page.goto("/components");
  await expect(page.getByRole("heading", { name: /Propriedades de Componentes/i })).toBeVisible();

  await selectComboboxOption(page, "Fluido crítico", "Water");
  await page.getByRole("button", { name: /Obter propriedades críticas/i }).click();
  const criticalTable = page.locator("table").filter({ hasText: "Temperatura crítica" }).first();
  await expect(criticalTable).toBeVisible();
  await expect(criticalTable).toContainText("647,1");
  await expect(criticalTable).toContainText("2,2064");
  await expect(criticalTable).toContainText("273,16");
  await expect(criticalTable).toContainText("611,657");

  await page.getByRole("tab", { name: /^Fluido Puro$/i }).click();
  await selectComboboxOption(page, "Fluido puro", "Water");
  await selectComboboxOption(page, "Propriedades do fluido", "D");
  await selectComboboxOption(page, "Propriedades do fluido", "V");
  await page.getByLabel("Temperatura do fluido (K)").fill("298.15");
  await page.getByLabel("Pressão do fluido (Pa)").fill("101325");
  await page.getByRole("button", { name: /Calcular propriedades/i }).click();
  const pureTable = page.locator("table").filter({ hasText: "Massa específica" }).first();
  await expect(pureTable).toBeVisible();
  await expect(pureTable).toContainText("997");
  await expect(pureTable).toContainText(/8,9.*10.*4/);

  await page.getByRole("tab", { name: /^Misturas$/i }).click();
  await selectComboboxOption(page, "Mistura componente 1", "Water");
  await page.getByLabel("Fração molar 1").fill("0.7");
  await selectComboboxOption(page, "Mistura componente 2", "Ethanol");
  await page.getByLabel("Fração molar 2").fill("0.2");
  await page.getByRole("button", { name: /Adicionar fluido/i }).click();
  await selectComboboxOption(page, "Mistura componente 3", "Propane");
  await page.getByLabel("Fração molar 3").fill("0.1");
  await page.getByLabel("Temperatura da mistura (K)").fill("300");
  await page.getByLabel("Pressão da mistura (Pa)").fill("101325");
  await selectComboboxOption(page, "Propriedades da mistura", "D");
  await selectComboboxOption(page, "Propriedades da mistura", "Z");
  await page.getByRole("button", { name: /Calcular mistura/i }).click();
  const mixtureTable = page.locator("table").filter({ hasText: "Massa específica" }).last();
  await expect(mixtureTable).toBeVisible();
  await expect(mixtureTable).toContainText("812,5");
  await expect(mixtureTable).toContainText("0,98");

  await page.getByRole("tab", { name: /Propriedades Críticas/i }).click();
  await page.getByRole("button", { name: /Como funciona - Propriedades Críticas/i }).click();
  await expect(page.getByText(/ponto acima do qual a distinção entre fase líquida e vapor desaparece/i)).toBeVisible();

  await page.getByRole("tab", { name: /^Fluido Puro$/i }).click();
  await expect(page.getByRole("button", { name: /Como funciona - Fluido Puro/i })).toBeVisible();

  await page.getByRole("tab", { name: /^Misturas$/i }).click();
  await expect(page.getByRole("button", { name: /Como funciona - Misturas/i })).toBeVisible();
});

test("components module surfaces an error when critical properties lookup fails", async ({ page }) => {
  await page.route("**/api/components/list", async (route) => {
    await route.fulfill({
      json: ["Water", "Ethanol", "Propane"],
    });
  });

  await page.route("**/api/components/property-names", async (route) => {
    await route.fulfill({
      json: {
        D: "Massa específica [kg/m³]",
        V: "Viscosity [Pa·s]",
      },
    });
  });

  await page.route("**/api/components/property-mixture-names", async (route) => {
    await route.fulfill({
      json: {
        D: "Massa específica [kg/m³]",
        Z: "Compressibility factor [-]",
      },
    });
  });

  await page.route("**/api/components/critical-properties", async (route) => {
    await route.fulfill({
      status: 400,
      json: {
        detail: "Falha no backend crítico",
      },
    });
  });

  await page.goto("/components");
  await expect(page.getByRole("heading", { name: /Propriedades de Componentes/i })).toBeVisible();

  await selectComboboxOption(page, "Fluido crítico", "Water");
  await page.getByRole("button", { name: /Obter propriedades críticas/i }).click();
  await expect(page.getByRole("alert").last()).toContainText(
    /Erro ao obter propriedades críticas: Falha no backend crítico/i,
  );
});

test("components module surfaces an error when the initial catalog load fails", async ({
  page,
}) => {
  await page.route("**/api/components/list", async (route) => {
    await route.fulfill({
      status: 500,
      json: {
        detail: "Falha no catálogo",
      },
    });
  });

  await page.route("**/api/components/property-names", async (route) => {
    await route.fulfill({
      json: {
        D: "Massa específica [kg/m³]",
      },
    });
  });

  await page.route("**/api/components/property-mixture-names", async (route) => {
    await route.fulfill({
      json: {
        D: "Massa específica [kg/m³]",
      },
    });
  });

  await page.goto("/components");
  await expect(page.getByRole("heading", { name: /Propriedades de Componentes/i })).toBeVisible();
  await expect(page.getByText(/Falha no catálogo/i)).toBeVisible();
});

test("components module surfaces an error when pure property lookup fails", async ({ page }) => {
  await page.route("**/api/components/list", async (route) => {
    await route.fulfill({
      json: ["Water", "Ethanol", "Propane"],
    });
  });

  await page.route("**/api/components/property-names", async (route) => {
    await route.fulfill({
      json: {
        D: "Massa específica [kg/m³]",
        V: "Viscosity [Pa·s]",
      },
    });
  });

  await page.route("**/api/components/property-mixture-names", async (route) => {
    await route.fulfill({
      json: {
        D: "Massa específica [kg/m³]",
        Z: "Compressibility factor [-]",
      },
    });
  });

  await page.route("**/api/components/property", async (route) => {
    const body = route.request().postDataJSON() as { property_name?: string };

    if (body.property_name === "D") {
      await route.fulfill({
        status: 400,
        json: {
          detail: "Falha no backend puro",
        },
      });
      return;
    }

    await route.fulfill({ json: { value: 1, units: "" } });
  });

  await page.goto("/components");
  await expect(page.getByRole("heading", { name: /Propriedades de Componentes/i })).toBeVisible();

  await page.getByRole("tab", { name: /^Fluido Puro$/i }).click();
  await selectComboboxOption(page, "Fluido puro", "Water");
  await selectComboboxOption(page, "Propriedades do fluido", "D");
  await page.getByLabel("Temperatura do fluido (K)").fill("298.15");
  await page.getByLabel("Pressão do fluido (Pa)").fill("101325");
  await page.getByRole("button", { name: /Calcular propriedades/i }).click();

  await expect(page.getByText(/Erro ao obter propriedade: Falha no backend puro/i)).toBeVisible();
});

test("components module surfaces an error when mixture property lookup fails", async ({ page }) => {
  await page.route("**/api/components/list", async (route) => {
    await route.fulfill({
      json: ["Water", "Ethanol", "Propane"],
    });
  });

  await page.route("**/api/components/property-names", async (route) => {
    await route.fulfill({
      json: {
        D: "Massa específica [kg/m³]",
        V: "Viscosity [Pa·s]",
      },
    });
  });

  await page.route("**/api/components/property-mixture-names", async (route) => {
    await route.fulfill({
      json: {
        D: "Massa específica [kg/m³]",
        Z: "Compressibility factor [-]",
      },
    });
  });

  await page.route("**/api/components/mixture-properties", async (route) => {
    await route.fulfill({
      status: 400,
      json: {
        detail: "Falha no backend da mistura",
      },
    });
  });

  await page.goto("/components");
  await expect(page.getByRole("heading", { name: /Propriedades de Componentes/i })).toBeVisible();

  await page.getByRole("tab", { name: /^Misturas$/i }).click();
  await selectComboboxOption(page, "Mistura componente 1", "Water");
  await page.getByLabel("Fração molar 1").fill("0.7");
  await selectComboboxOption(page, "Mistura componente 2", "Ethanol");
  await page.getByLabel("Fração molar 2").fill("0.3");
  await page.getByLabel("Temperatura da mistura (K)").fill("300");
  await page.getByLabel("Pressão da mistura (Pa)").fill("101325");
  await page.getByRole("button", { name: /Calcular mistura/i }).click();

  await expect(
    page.getByText(/Erro ao calcular propriedades da mistura: Falha no backend da mistura/i),
  ).toBeVisible();
});

test("components module ignores delayed mixture results after the form changes", async ({
  page,
}) => {
  let resolveMixture: (() => void) | undefined;

  await page.route("**/api/components/list", async (route) => {
    await route.fulfill({
      json: ["Water", "Ethanol", "Propane"],
    });
  });

  await page.route("**/api/components/property-names", async (route) => {
    await route.fulfill({
      json: {
        D: "Massa específica [kg/m³]",
        V: "Viscosity [Pa·s]",
      },
    });
  });

  await page.route("**/api/components/property-mixture-names", async (route) => {
    await route.fulfill({
      json: {
        D: "Massa específica [kg/m³]",
        Z: "Compressibility factor [-]",
      },
    });
  });

  await page.route("**/api/components/mixture-properties", async (route) => {
    await new Promise<void>((resolve) => {
      resolveMixture = () => {
        void route.fulfill({
          json: {
            properties: {
              D: { value: 812.5, units: "kilogram / meter ** 3" },
              Z: { value: 0.98, units: "dimensionless" },
            },
          },
        });
        resolve();
      };
    });
  });

  await page.goto("/components");
  await expect(page.getByRole("heading", { name: /Propriedades de Componentes/i })).toBeVisible();

  await page.getByRole("tab", { name: /^Misturas$/i }).click();
  await selectComboboxOption(page, "Mistura componente 1", "Water");
  await page.getByLabel("Fração molar 1").fill("0.7");
  await selectComboboxOption(page, "Mistura componente 2", "Ethanol");
  await page.getByLabel("Fração molar 2").fill("0.3");
  await page.getByLabel("Temperatura da mistura (K)").fill("300");
  await page.getByLabel("Pressão da mistura (Pa)").fill("101325");
  await page.getByRole("button", { name: /Calcular mistura/i }).click();

  await page.getByLabel("Temperatura da mistura (K)").fill("305");
  resolveMixture?.();

  await expect(page.getByText(/812.5 kilogram \/ meter \*\* 3/i)).toHaveCount(0);
  await expect(page.getByText(/0.98 dimensionless/i)).toHaveCount(0);
});
