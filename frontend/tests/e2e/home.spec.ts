import { expect, test } from "@playwright/test";

test("renders the new IA home entry points", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: "Iniciar uma simulação" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Seguir uma trilha" })).toBeVisible();
  await expect(page.getByText("Recursos de Apoio")).toBeVisible();
  await expect(page.getByText("Para Docência")).toBeVisible();
});

test("starts from home and reaches a simulation through the new primary CTA", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Iniciar uma simulação" }).click();
  await expect(page.getByRole("heading", { name: "Simulações em Destaque" })).toBeVisible();
  await page.getByRole("button", { name: "Abrir módulo de Escoamento" }).click();
  await expect(page.getByRole("heading", { name: "Cálculos de Escoamento" })).toBeVisible();
});

test("navigates to piping and sizing with mocked API responses", async ({ page }) => {
  await page.route("https://tcc.api.homelab.sistemasj.com.br/**", async (route) => {
    const url = new URL(route.request().url());
    const { pathname } = url;

    const json =
      pathname === "/piping/compositions"
        ? ["Aço comercial"]
        : pathname === "/piping/schedules"
          ? [{ name: "SCH40", diameters: [50], description: "Schedule padrão" }]
          : pathname === "/piping/fittings"
            ? ["Cotovelo 90° raio longo"]
            : pathname === "/piping/composition/A%C3%A7o%20comercial"
              ? {
                  name: "Aço comercial",
                  description: "Tubulação de aço carbono padrão",
                  specifications: {
                    roughness: { value: 0.06, units: "millimeter" }
                  }
                }
              : pathname === "/piping/schedule/SCH40/diameters"
                ? {
                    50: { nominal_diameter: 50, external_diameter: 60.3, units: "mm" }
                  }
                : pathname === "/piping/schedule/SCH40/diameter/50"
                  ? {
                      external_diameter: { value: 60.3, units: "millimeter" }
                    }
                  : pathname === "/piping/fitting/Cotovelo%2090%C2%B0%20raio%20longo"
                    ? {
                        name: "Cotovelo 90° raio longo",
                        specifications: {
                          equivalentLength: { value: 16, units: "dimensionless" }
                        }
                      }
                    : pathname === "/sizing/calculated-diameter"
                      ? { value: 79.78845608028654, units: "millimeter" }
                      : pathname === "/sizing/real-diameter"
                        ? { value: 80, units: "millimeter" }
                        : pathname === "/flow/friction-factor/methods"
                          ? ["ColebrookWhite", "SwameeJain", "Haaland"]
                          : pathname === "/flow/hydraulic-diameter/shapes"
                            ? ["circular", "rectangular", "annular", "triangular", "circularCap"]
                            : pathname === "/flow/reynolds"
                              ? { value: 99800, units: "dimensionless" }
                              : pathname === "/flow/friction-factor"
                                ? { value: 0.0223, units: "dimensionless" }
                                : pathname === "/flow/hydraulic-diameter"
                                  ? { value: 66.66666666666667, units: "millimeter" }
                        : null;

    if (json === null) {
      await route.abort();
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(json)
    });
  });

  await page.goto("/");

  const sidebarNav = page.locator(".sidebar-nav");
  await sidebarNav.getByRole("link", { name: "Tubulações", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Cálculos de Tubulação" })).toBeVisible();

  await page.getByLabel("Selecionar Composição").selectOption("Aço comercial");
  await expect(page.getByText("Detalhes da Composição")).toBeVisible();

  await page.getByLabel("Selecionar Schedule").selectOption("SCH40");
  await page.getByLabel("Selecionar Diâmetro").selectOption("50");
  await expect(page.getByText("Detalhes do Diâmetro")).toBeVisible();

  await sidebarNav.getByRole("link", { name: "Dimensionamento", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Dimensionamento de Tubo" })).toBeVisible();

  await page.getByLabel("Vazão (m³/s)").fill("0.01");
  await page.getByLabel("Velocidade (m/s)").fill("2");
  await page.getByRole("button", { name: "Calcular Diâmetro" }).click();
  await expect(page.getByRole("heading", { name: "Diâmetro Calculado" })).toBeVisible();

  await page.getByLabel("Schedule").selectOption("SCH40");
  await page.getByRole("button", { name: "Encontrar Diâmetro Real" }).click();
  await expect(page.getByRole("heading", { name: "Diâmetro Real" })).toBeVisible();

  await sidebarNav.getByRole("link", { name: "Glossário", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Glossário" })).toBeVisible();
  await page.getByRole("searchbox", { name: "Pesquisar no glossário" }).fill("npsh");
  await expect(page.getByText("NPSH Disponível (NPSHd)")).toBeVisible();

  await sidebarNav.getByRole("link", { name: "Escoamento", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Cálculos de Escoamento" })).toBeVisible();

  await page.getByLabel("Diâmetro Característico (mm)").fill("50");
  await page.getByLabel("Velocidade (m/s)").first().fill("2");
  await page.getByLabel("Densidade (kg/m³)").fill("998");
  await page.getByLabel("Viscosidade Dinâmica (Pa·s)").fill("0.001");
  await page.getByRole("button", { name: "Calcular Número de Reynolds" }).click();
  await expect(page.locator("#reynolds-number")).toHaveValue("99800.00");

  await page.getByLabel("Composição do Material").selectOption("Aço comercial");
  await page.getByLabel("Schedule do Tubo").selectOption("SCH40");
  await page.getByLabel("Diâmetro (mm)").first().selectOption("50");
  await page.getByLabel("Método").selectOption("SwameeJain");
  await page.getByRole("button", { name: "Calcular Fator de Atrito" }).click();
  await expect(page.getByText("0.0223")).toBeVisible();

  await page.getByLabel("Forma").selectOption("rectangular");
  await page.getByLabel("Largura (mm)").fill("100");
  await page.getByLabel("Altura (mm)").fill("50");
  await page.getByRole("button", { name: "Calcular Diâmetro Hidráulico" }).click();
  await expect(page.getByText("66.6667")).toBeVisible();
});
