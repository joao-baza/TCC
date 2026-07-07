import { expect, test } from "@playwright/test";

test("balance module loads the example and calculates results", async ({
  page,
}) => {
  await mockMassBalancePage(page);

  await page.goto("/balance");
  await expect(page.getByRole("heading", { name: /^Balanço de Massa$/i })).toBeVisible();

  await page.getByRole("button", { name: /Carregar exemplo/i }).click();
  await page.getByRole("tab", { name: /^Ações$/i }).click();
  await page.getByRole("button", { name: /Calcular Balanço de Massa/i }).click();

  await page.getByRole("tab", { name: /Resultados/i }).click();
  await expect(page.getByText(/Taxa de reciclo/i)).toBeVisible();
  await expect(page.getByText(/Alimentação fresca/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Reciclo$/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Produto$/i })).toBeVisible();

  await page.getByRole("tab", { name: /^Ações$/i }).click();
  await page.getByRole("button", { name: /Calcular Rendimentos/i }).click();
  await page.getByRole("tab", { name: /Rendimentos/i }).click();
  await expect(page.getByText(/C a partir de A/i)).toBeVisible();
  await expect(page.getByText(/81.25%/i)).toBeVisible();
});

test("balance module clears calculated results after the component structure changes", async ({
  page,
}) => {
  await mockMassBalancePage(page);

  await page.goto("/balance");
  await page.getByRole("button", { name: /Carregar exemplo/i }).click();
  await page.getByRole("tab", { name: /^Ações$/i }).click();
  await page.getByRole("button", { name: /Calcular Balanço de Massa/i }).click();
  await page.getByRole("tab", { name: /Resultados/i }).click();
  await expect(page.getByText(/Taxa de reciclo/i)).toBeVisible();
  await page.getByRole("tab", { name: /^Ações$/i }).click();
  await page.getByRole("button", { name: /Calcular Rendimentos/i }).click();
  await page.getByRole("tab", { name: /Rendimentos/i }).click();

  await expect(page.getByText(/81.25%/i)).toBeVisible();

  await page.getByRole("tab", { name: /Componentes/i }).click();
  await page.getByLabel(/Nome do componente/i).fill("E");
  await page.getByRole("button", { name: /^Adicionar$/i }).click();

  await expect(page.getByText(/Taxa de reciclo/i)).toHaveCount(0);
  await expect(page.getByText(/81.25%/i)).toHaveCount(0);
});

test("balance module surfaces an error when yield calculation fails", async ({ page }) => {
  await mockMassBalancePage(page);

  await page.route("**/api/mass-balance/yields", async (route) => {
    await route.fulfill({
      status: 400,
      json: {
        detail: "Falha no backend dos rendimentos",
      },
    });
  });

  await page.goto("/balance");
  await expect(page.getByRole("heading", { name: /^Balanço de Massa$/i })).toBeVisible();

  await page.getByRole("button", { name: /Carregar exemplo/i }).click();
  await page.getByRole("tab", { name: /^Ações$/i }).click();
  await page.getByRole("button", { name: /Calcular Balanço de Massa/i }).click();

  await page.getByRole("button", { name: /Calcular Rendimentos/i }).click();
  await expect(
    page.getByText(/Erro ao calcular rendimentos: Falha no backend dos rendimentos/i),
  ).toBeVisible();
});

test("balance module surfaces an error when mass balance calculation fails", async ({ page }) => {
  await mockMassBalancePage(page);

  await page.route("**/api/mass-balance/calculate", async (route) => {
    await route.fulfill({
      status: 400,
      json: {
        detail: "Falha no backend do balanço",
      },
    });
  });

  await page.goto("/balance");
  await expect(page.getByRole("heading", { name: /^Balanço de Massa$/i })).toBeVisible();

  await page.getByRole("button", { name: /Carregar exemplo/i }).click();
  await page.getByRole("tab", { name: /^Ações$/i }).click();
  await page.getByRole("button", { name: /Calcular Balanço de Massa/i }).click();

  await expect(page.getByText(/Erro ao calcular balanço de massa: Falha no backend do balanço/i)).toBeVisible();
});

async function mockMassBalancePage(page) {
  await page.route("**/api/mass-balance/example", async (route) => {
    await route.fulfill({
      json: {
        components: ["A", "B", "C", "D"],
        streams: [
          {
            name: "Alimentacao_Fresca",
            direction: 1,
            flow_rate: 100,
            compositions: { A: 0.8, B: 0.2, C: 0, D: 0 },
          },
          {
            name: "Saida_Do_Reator",
            direction: -1,
            flow_rate: null,
            compositions: { A: null, B: null, C: null, D: null },
          },
          {
            name: "Reciclo",
            direction: 1,
            flow_rate: null,
            compositions: { A: null, B: null, C: null, D: null },
          },
          {
            name: "Produto",
            direction: -1,
            flow_rate: null,
            compositions: { A: null, B: null, C: null, D: null },
          },
        ],
        reactions: [
          {
            stoichiometry: { A: -1, C: 1 },
            key_component: "A",
            conversion: 0.7,
          },
        ],
        splits: [
          {
            parent_stream: "Saida_Do_Reator",
            recycle_stream: "Reciclo",
            purge_stream: "Produto",
            fraction: 0.6,
          },
        ],
      },
    });
  });

  await page.route("**/api/mass-balance/calculate", async (route) => {
    await route.fulfill({
      json: {
        metrics: {
          fresh_feed: 100,
          product_flow: 40,
          recycle_ratio: 0.6,
        },
        results: {
          Alimentacao_Fresca: {
            flow_rate: 100,
            compositions: { A: 0.8, B: 0.2, C: 0, D: 0 },
          },
          Reciclo: {
            flow_rate: 60,
            compositions: { A: 0.18, B: 0.05, C: 0.57, D: 0.2 },
          },
          Produto: {
            flow_rate: 40,
            compositions: { A: 0.1, B: 0.05, C: 0.65, D: 0.2 },
          },
        },
      },
    });
  });

  await page.route("**/api/mass-balance/yields", async (route) => {
    await route.fulfill({
      json: {
        yields: {
          C_from_A: 81.25,
          D_from_B: 77.5,
        },
        results: {
          Produto: {
            flow_rate: 40,
            compositions: { A: 0.1, B: 0.05, C: 0.65, D: 0.2 },
          },
        },
      },
    });
  });
}
