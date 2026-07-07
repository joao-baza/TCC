import { expect, test } from "@playwright/test";

test("balance module loads the example, calculates results, and shows exploratory controls", async ({
  page,
}) => {
  await page.route("**/api/mass-balance/example", async (route) => {
    await route.fulfill({
      json: {
        components: ["A", "B", "C", "D"],
        streams: [
          {
            name: "Fresh_Feed",
            direction: 1,
            flow_rate: 100,
            compositions: { A: 0.8, B: 0.2, C: 0, D: 0 },
          },
          {
            name: "Reactor_Out",
            direction: -1,
            flow_rate: null,
            compositions: { A: null, B: null, C: null, D: null },
          },
          {
            name: "Recycle",
            direction: 1,
            flow_rate: null,
            compositions: { A: null, B: null, C: null, D: null },
          },
          {
            name: "Product",
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
            parent_stream: "Reactor_Out",
            recycle_stream: "Recycle",
            purge_stream: "Product",
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
          Fresh_Feed: {
            flow_rate: 100,
            compositions: { A: 0.8, B: 0.2, C: 0, D: 0 },
          },
          Recycle: {
            flow_rate: 60,
            compositions: { A: 0.18, B: 0.05, C: 0.57, D: 0.2 },
          },
          Product: {
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
          Product: {
            flow_rate: 40,
            compositions: { A: 0.1, B: 0.05, C: 0.65, D: 0.2 },
          },
        },
      },
    });
  });

  await page.goto("/balance");
  await expect(page.getByRole("heading", { name: /^Balanço de Massa$/i })).toBeVisible();
  await expect(page.getByRole("region", { name: /Painel Exploratório/i })).toBeVisible();

  await page.getByRole("button", { name: /Carregar exemplo/i }).click();
  await expect(page.locator('input[value="Fresh_Feed"]').first()).toBeVisible();
  await expect(page.locator('input[type="number"][value="0.6"]').first()).toBeVisible();

  await page.getByRole("button", { name: /Calcular Balanço de Massa/i }).click();
  await expect(page.getByText(/Taxa de reciclo/i)).toBeVisible();
  await expect(page.getByTestId("stream-graph")).toBeVisible();
  await expect(page.getByTestId("stream-graph").getByText("Fresh_Feed")).toBeVisible();
  await expect(page.getByTestId("stream-graph").getByText("Recycle")).toBeVisible();
  await expect(page.getByTestId("stream-graph").getByText("Product")).toBeVisible();

  await page.getByRole("button", { name: /Calcular Rendimentos/i }).click();
  await expect(page.getByText(/C from A/i)).toBeVisible();
  await expect(page.getByText(/81.25%/i)).toBeVisible();

  await page.getByLabel("Modo Exploratório").selectOption("recycle-system");
  await expect(page.getByText(/Roteiro de exploração/i)).toBeVisible();
  await expect(page.getByText(/Razao de reciclo/i)).toBeVisible();
  await expect(page.getByText(/Fracao do componente principal/i).first()).toBeVisible();
});

test("balance module shows saved exploratory scenarios in the stream graph", async ({
  page,
}) => {
  await page.route("**/api/mass-balance/example", async (route) => {
    await route.fulfill({
      json: {
        components: ["A", "B", "C", "D"],
        streams: [
          {
            name: "Fresh_Feed",
            direction: 1,
            flow_rate: 100,
            compositions: { A: 0.8, B: 0.2, C: 0, D: 0 },
          },
          {
            name: "Reactor_Out",
            direction: -1,
            flow_rate: null,
            compositions: { A: null, B: null, C: null, D: null },
          },
          {
            name: "Recycle",
            direction: 1,
            flow_rate: null,
            compositions: { A: null, B: null, C: null, D: null },
          },
          {
            name: "Product",
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
            parent_stream: "Reactor_Out",
            recycle_stream: "Recycle",
            purge_stream: "Product",
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
          Fresh_Feed: {
            flow_rate: 100,
            compositions: { A: 0.8, B: 0.2, C: 0, D: 0 },
          },
          Recycle: {
            flow_rate: 60,
            compositions: { A: 0.18, B: 0.05, C: 0.57, D: 0.2 },
          },
          Product: {
            flow_rate: 40,
            compositions: { A: 0.1, B: 0.05, C: 0.65, D: 0.2 },
          },
        },
      },
    });
  });

  await page.goto("/balance");
  await page.getByRole("button", { name: /Carregar exemplo/i }).click();
  await page.getByLabel("Modo Exploratório").selectOption("simple-separation");
  await page.getByRole("button", { name: /Calcular Balanço de Massa/i }).click();

  await expect(page.getByText(/Taxa de reciclo/i)).toBeVisible();
  await expect(page.getByTestId("stream-graph")).toBeVisible();
  await page.getByRole("button", { name: /Salvar cenário/i }).click();

  const graph = page.getByTestId("stream-graph");
  await expect(graph.getByTestId("saved-scenarios")).toBeVisible();
  await expect(graph.getByTestId("saved-scenario")).toHaveCount(1);
  await expect(graph.getByTestId("saved-scenario")).toContainText(/R=/i);
});

test("balance module clears calculated results after the component structure changes", async ({
  page,
}) => {
  await page.route("**/api/mass-balance/example", async (route) => {
    await route.fulfill({
      json: {
        components: ["A", "B", "C", "D"],
        streams: [
          {
            name: "Fresh_Feed",
            direction: 1,
            flow_rate: 100,
            compositions: { A: 0.8, B: 0.2, C: 0, D: 0 },
          },
          {
            name: "Reactor_Out",
            direction: -1,
            flow_rate: null,
            compositions: { A: null, B: null, C: null, D: null },
          },
          {
            name: "Recycle",
            direction: 1,
            flow_rate: null,
            compositions: { A: null, B: null, C: null, D: null },
          },
          {
            name: "Product",
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
            parent_stream: "Reactor_Out",
            recycle_stream: "Recycle",
            purge_stream: "Product",
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
          Fresh_Feed: {
            flow_rate: 100,
            compositions: { A: 0.8, B: 0.2, C: 0, D: 0 },
          },
          Recycle: {
            flow_rate: 60,
            compositions: { A: 0.18, B: 0.05, C: 0.57, D: 0.2 },
          },
          Product: {
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
          Product: {
            flow_rate: 40,
            compositions: { A: 0.1, B: 0.05, C: 0.65, D: 0.2 },
          },
        },
      },
    });
  });

  await page.goto("/balance");
  await page.getByRole("button", { name: /Carregar exemplo/i }).click();
  await page.getByRole("button", { name: /Calcular Balanço de Massa/i }).click();
  await page.getByRole("button", { name: /Calcular Rendimentos/i }).click();

  await expect(page.getByText(/Taxa de reciclo/i)).toBeVisible();
  await expect(page.getByText(/81.25%/i)).toBeVisible();

  await page.getByLabel(/Nome do componente/i).fill("E");
  await page.getByRole("button", { name: /^Adicionar$/i }).click();

  await expect(page.getByText(/Taxa de reciclo/i)).toHaveCount(0);
  await expect(page.getByText(/81.25%/i)).toHaveCount(0);
});

test("balance module surfaces an error when yield calculation fails", async ({ page }) => {
  await page.route("**/api/mass-balance/example", async (route) => {
    await route.fulfill({
      json: {
        components: ["A", "B", "C", "D"],
        streams: [
          {
            name: "Fresh_Feed",
            direction: 1,
            flow_rate: 100,
            compositions: { A: 0.8, B: 0.2, C: 0, D: 0 },
          },
          {
            name: "Reactor_Out",
            direction: -1,
            flow_rate: null,
            compositions: { A: null, B: null, C: null, D: null },
          },
          {
            name: "Recycle",
            direction: 1,
            flow_rate: null,
            compositions: { A: null, B: null, C: null, D: null },
          },
          {
            name: "Product",
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
            parent_stream: "Reactor_Out",
            recycle_stream: "Recycle",
            purge_stream: "Product",
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
          Fresh_Feed: {
            flow_rate: 100,
            compositions: { A: 0.8, B: 0.2, C: 0, D: 0 },
          },
          Recycle: {
            flow_rate: 60,
            compositions: { A: 0.18, B: 0.05, C: 0.57, D: 0.2 },
          },
          Product: {
            flow_rate: 40,
            compositions: { A: 0.1, B: 0.05, C: 0.65, D: 0.2 },
          },
        },
      },
    });
  });

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
  await page.getByRole("button", { name: /Calcular Balanço de Massa/i }).click();
  await expect(page.getByTestId("stream-graph")).toBeVisible();

  await page.getByRole("button", { name: /Calcular Rendimentos/i }).click();
  await expect(
    page.getByText(/Erro ao calcular rendimentos: Falha no backend dos rendimentos/i),
  ).toBeVisible();
});

test("balance module surfaces an error when mass balance calculation fails", async ({ page }) => {
  await page.route("**/api/mass-balance/example", async (route) => {
    await route.fulfill({
      json: {
        components: ["A", "B", "C", "D"],
        streams: [
          {
            name: "Fresh_Feed",
            direction: 1,
            flow_rate: 100,
            compositions: { A: 0.8, B: 0.2, C: 0, D: 0 },
          },
          {
            name: "Reactor_Out",
            direction: -1,
            flow_rate: null,
            compositions: { A: null, B: null, C: null, D: null },
          },
          {
            name: "Recycle",
            direction: 1,
            flow_rate: null,
            compositions: { A: null, B: null, C: null, D: null },
          },
          {
            name: "Product",
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
            parent_stream: "Reactor_Out",
            recycle_stream: "Recycle",
            purge_stream: "Product",
            fraction: 0.6,
          },
        ],
      },
    });
  });

  await page.route("**/api/mass-balance/calculate", async (route) => {
    await route.fulfill({
      status: 400,
      json: {
        detail: "Falha no backend do balanço",
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
          Product: {
            flow_rate: 40,
            compositions: { A: 0.1, B: 0.05, C: 0.65, D: 0.2 },
          },
        },
      },
    });
  });

  await page.goto("/balance");
  await expect(page.getByRole("heading", { name: /^Balanço de Massa$/i })).toBeVisible();

  await page.getByRole("button", { name: /Carregar exemplo/i }).click();
  await page.getByRole("button", { name: /Calcular Balanço de Massa/i }).click();

  await expect(page.getByText(/Erro ao calcular balanço de massa: Falha no backend do balanço/i)).toBeVisible();
});
