import { expect, test } from "@playwright/test";

import { exerciseCatalog } from "@/features/exercises/catalog";

test("heat exchanger guided exercise completes in the browser", async ({ page }) => {
  await page.route("**/api/components/property", async (route) => {
    const body = route.request().postDataJSON() as {
      property_name?: string;
      temperature?: number;
    };

    if (body.property_name === "H" && body.temperature === 298.15) {
      await route.fulfill({ json: { value: 120000, units: "J/kg" } });
      return;
    }

    if (body.property_name === "Q" && body.temperature === 298.15) {
      await route.fulfill({ json: { value: -1, units: "" } });
      return;
    }

    if (body.property_name === "C" && body.temperature === 298.15) {
      await route.fulfill({ json: { value: 2300, units: "J/kg/K" } });
      return;
    }

    if (body.property_name === "H" && body.temperature === 353.15) {
      await route.fulfill({ json: { value: 210000, units: "J/kg" } });
      return;
    }

    if (body.property_name === "Q" && body.temperature === 353.15) {
      await route.fulfill({ json: { value: -1, units: "" } });
      return;
    }

    await route.fulfill({ json: { value: 1, units: "" } });
  });

  await page.goto("/exercises");
  await expect(page.getByRole("heading", { name: "Exercícios Integrados" })).toBeVisible();

  await page.getByRole("button", { name: /Abrir Trocador de Calor/i }).click();
  await page.getByRole("button", { name: /Calcular h₁ via CoolProp/i }).click();
  await expect(page.getByText(/h₁ = 120000.0 J\/kg/i)).toBeVisible();

  await page.getByRole("button", { name: /Próxima Etapa/i }).click();
  await page.getByRole("button", { name: /Calcular h₂ via CoolProp/i }).click();
  await expect(page.getByText(/h₂ = 210000.0 J\/kg/i)).toBeVisible();

  await page.getByRole("button", { name: /Próxima Etapa/i }).click();
  await page.getByRole("button", { name: /Calcular Q̇/i }).click();
  await expect(page.getByText(/Q̇ = 135.00 kW/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Concluir Exercício ✓/i })).toBeVisible();

  await page.getByRole("button", { name: /Concluir Exercício ✓/i }).click();
  await expect(page.getByText(/Exercício concluído!/i)).toBeVisible();
});

test("exercise catalog shows every legacy exercise entry", async ({ page }) => {
  await page.route("**/api/components/list", async (route) => {
    await route.fulfill({ json: ["Water", "n-Propane", "Methane"] });
  });
  await page.route("**/api/piping/schedules", async (route) => {
    await route.fulfill({
      json: [{ name: "SCH40", diameters: [25], description: "Schedule padrão." }],
    });
  });
  await page.route("**/api/piping/compositions", async (route) => {
    await route.fulfill({ json: ["Aço comercial"] });
  });
  await page.route("**/api/components/critical-properties", async (route) => {
    await route.fulfill({
      json: {
        critical_temperature: 647.1,
        critical_pressure: 22064000,
      },
    });
  });

  await page.goto("/exercises");
  await expect(page.getByRole("heading", { name: "Exercícios Integrados" })).toBeVisible();

  for (const exercise of exerciseCatalog) {
    await expect(page.getByRole("button", { name: `Abrir ${exercise.title}` })).toBeVisible();
    await expect(page.getByRole("heading", { name: exercise.title })).toBeVisible();
  }
});

test("heat exchanger guided exercise surfaces an error when the first property lookup fails", async ({
  page,
}) => {
  await page.route("**/api/components/property", async (route) => {
    const body = route.request().postDataJSON() as {
      fluid?: string;
      property_name?: string;
      temperature?: number;
    };

    if (
      body.fluid === "n-Propane" &&
      body.property_name === "H" &&
      body.temperature === 298.15
    ) {
      await route.fulfill({
        status: 400,
        json: { detail: "Falha no backend do trocador" },
      });
      return;
    }

    await route.fulfill({ json: { value: 1, units: "" } });
  });

  await page.goto("/exercises");
  await expect(page.getByRole("heading", { name: "Exercícios Integrados" })).toBeVisible();

  await page.getByRole("button", { name: /Abrir Trocador de Calor/i }).click();
  await page.getByRole("button", { name: /Calcular h₁ via CoolProp/i }).click();

  await expect(
    page.getByText(/Erro ao executar o exercício: Falha no backend do trocador/i),
  ).toBeVisible();
});

test("heat exchanger guided exercise surfaces a timeout warning when the request stalls", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const originalSetTimeout = window.setTimeout.bind(window);
    window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
      if (timeout === 30000) {
        return originalSetTimeout(handler, 0, ...args);
      }

      return originalSetTimeout(handler, timeout as number, ...args);
    }) as typeof window.setTimeout;
  });

  await page.route("**/api/components/property", async (route) => {
    const body = route.request().postDataJSON() as {
      fluid?: string;
      property_name?: string;
      temperature?: number;
    };

    if (body.fluid === "n-Propane" && body.property_name === "H" && body.temperature === 298.15) {
      await route.fulfill({ json: { value: 120000, units: "J/kg" } });
      return;
    }

    if (body.fluid === "n-Propane" && body.property_name === "Q" && body.temperature === 298.15) {
      await route.fulfill({ json: { value: -1, units: "" } });
      return;
    }

    if (body.fluid === "n-Propane" && body.property_name === "C" && body.temperature === 298.15) {
      await route.fulfill({ json: { value: 2300, units: "J/kg/K" } });
      return;
    }

    await route.fulfill({ json: { value: 1, units: "" } });
  });

  await page.goto("/exercises");
  await expect(page.getByRole("heading", { name: "Exercícios Integrados" })).toBeVisible();

  await page.getByRole("button", { name: /Abrir Trocador de Calor/i }).click();
  await page.getByRole("button", { name: /Calcular h₁ via CoolProp/i }).click();

  await expect(page.getByText(/Tempo esgotado\. Verifique a conexão com a API\./i)).toBeVisible();
});

test("rankine guided exercise completes in the browser", async ({ page }) => {
  await page.route("**/api/components/property", async (route) => {
    const body = route.request().postDataJSON() as {
      fluid?: string;
      property_name?: string;
      temperature?: number;
    };

    if (body.fluid === "Water" && body.property_name === "H" && body.temperature === 773.15) {
      await route.fulfill({ json: { value: 3450000, units: "J/kg" } });
      return;
    }

    if (body.fluid === "Water" && body.property_name === "S" && body.temperature === 773.15) {
      await route.fulfill({ json: { value: 7100, units: "J/kg/K" } });
      return;
    }

    await route.fulfill({ json: { value: 47400, units: "pascal" } });
  });

  await page.route("**/api/components/props-by-state", async (route) => {
    const body = route.request().postDataJSON() as {
      input1?: string;
      value1?: number;
      input2?: string;
      value2?: number;
      output?: string;
    };

    if (
      body.input1 === "P" &&
      body.value1 === 10000 &&
      body.input2 === "S" &&
      body.value2 === 7100 &&
      body.output === "H"
    ) {
      await route.fulfill({ json: { value: 2500000, units: "J/kg" } });
      return;
    }

    if (
      body.input1 === "P" &&
      body.value1 === 10000 &&
      body.input2 === "S" &&
      body.value2 === 7100 &&
      body.output === "Q"
    ) {
      await route.fulfill({ json: { value: 0.88, units: "dimensionless" } });
      return;
    }

    if (
      body.input1 === "P" &&
      body.value1 === 10000 &&
      body.input2 === "Q" &&
      body.value2 === 0 &&
      body.output === "H"
    ) {
      await route.fulfill({ json: { value: 191000, units: "J/kg" } });
      return;
    }

    if (
      body.input1 === "P" &&
      body.value1 === 10000 &&
      body.input2 === "Q" &&
      body.value2 === 0 &&
      body.output === "S"
    ) {
      await route.fulfill({ json: { value: 649, units: "J/kg/K" } });
      return;
    }

    if (
      body.input1 === "P" &&
      body.value1 === 10000 &&
      body.input2 === "Q" &&
      body.value2 === 0 &&
      body.output === "T"
    ) {
      await route.fulfill({ json: { value: 318.95, units: "K" } });
      return;
    }

    if (
      body.input1 === "P" &&
      body.value1 === 3000000 &&
      body.input2 === "S" &&
      body.value2 === 649 &&
      body.output === "H"
    ) {
      await route.fulfill({ json: { value: 194000, units: "J/kg" } });
      return;
    }

    await route.fulfill({ json: { value: 47400, units: "pascal" } });
  });

  await page.route("**/api/components/critical-properties", async (route) => {
    await route.fulfill({
      json: {
        critical_temperature: 647.1,
        critical_pressure: 22064000,
      },
    });
  });

  await page.goto("/exercises");
  await expect(page.getByRole("heading", { name: "Exercícios Integrados" })).toBeVisible();

  await page.getByRole("button", { name: /Abrir Ciclo de Rankine/i }).click();
  await expect(page.getByText(/vapor d'água/i)).toBeVisible();
  await expect(page.getByTestId("exercise-step-trail")).toBeVisible();
  await expect(page.locator('[data-testid="exercise-step-card"]')).toHaveCount(5);

  await page.getByRole("button", { name: /Calcular Estado 1 via CoolProp/i }).click();
  await expect(page.getByText(/h₁ = 3450000.0 J\/kg/i)).toBeVisible();
  await expect(page.getByText(/s₁ = 7100.00 J\/kg\/K/i)).toBeVisible();

  await page.getByRole("button", { name: /Próxima Etapa/i }).click();
  await page.getByRole("button", { name: /Calcular h₂ \(P\+S → H\)/i }).click();
  await expect(page.getByText(/h₂ = 2500000.0 J\/kg/i)).toBeVisible();
  await expect(page.getByText(/X₂ = 0.880/i)).toBeVisible();

  await page.getByRole("button", { name: /Próxima Etapa/i }).click();
  await page.getByRole("button", { name: /Calcular Estado 3 \(P\+Q=0\)/i }).click();
  await expect(page.getByText(/h₃ = 191000.0 J\/kg/i)).toBeVisible();
  await expect(page.getByText(/s₃ = 649.00 J\/kg\/K/i)).toBeVisible();
  await expect(page.getByText(/T_cond = 45.8 °C/i)).toBeVisible();

  await page.getByRole("button", { name: /Próxima Etapa/i }).click();
  await page.getByRole("button", { name: /Calcular h₄ \(P\+S → H\)/i }).click();
  await expect(page.getByText(/h₄ = 194000.0 J\/kg/i)).toBeVisible();

  await page.getByRole("button", { name: /Próxima Etapa/i }).click();
  await page.getByRole("button", { name: /Calcular Eficiência/i }).click();
  await expect(page.getByText(/η = 29.1 %/i)).toBeVisible();
  await expect(page.getByText(/η_Carnot = 58.7 %/i)).toBeVisible();
  await expect(page.getByText(/η\/η_Carnot = 49.5 %/i)).toBeVisible();
  await expect(page.getByText(/W_turbina/i)).toBeVisible();
  await expect(page.getByText(/Q_caldeira/i)).toBeVisible();
  await expect(page.getByText(/Você completou todas as etapas de Ciclo de Rankine/i)).toBeVisible();
});

test("reactor feed guided exercise completes in the browser", async ({ page }) => {
  await page.route("**/api/components/list", async (route) => {
    await route.fulfill({ json: ["Water", "n-Propane", "Methane"] });
  });

  await page.route("**/api/piping/schedules", async (route) => {
    await route.fulfill({
      json: [{ name: "SCH40", diameters: [25], description: "Schedule padrão." }],
    });
  });

  await page.route("**/api/piping/compositions", async (route) => {
    await route.fulfill({ json: ["Aço comercial"] });
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

  await page.route("**/api/piping/schedule/SCH40/diameters", async (route) => {
    await route.fulfill({
      json: {
        25: { nominal_diameter: 25, external_diameter: 33.4, units: "mm" },
      },
    });
  });

  await page.route("**/api/piping/composition/A%C3%A7o%20comercial", async (route) => {
    await route.fulfill({
      json: {
        name: "Aço comercial",
        specifications: {
          roughness: { value: 0.045, units: "millimeter" },
        },
      },
    });
  });

  await page.route("**/api/components/property", async (route) => {
    const body = route.request().postDataJSON() as {
      property_name?: string;
      temperature?: number;
    };

    if (body.property_name === "D" && body.temperature === 353.15) {
      await route.fulfill({ json: { value: 971.8, units: "kg/m3" } });
      return;
    }

    if (body.property_name === "V" && body.temperature === 353.15) {
      await route.fulfill({ json: { value: 0.000355, units: "Pa·s" } });
      return;
    }

    if (body.property_name === "C" && body.temperature === 353.15) {
      await route.fulfill({ json: { value: 4190, units: "J/kg/K" } });
      return;
    }

    if (body.property_name === "L" && body.temperature === 353.15) {
      await route.fulfill({ json: { value: 0.67, units: "W/m/K" } });
      return;
    }

    await route.fulfill({ json: { value: 47400, units: "pascal" } });
  });

  await page.route("**/api/components/props-by-state", async (route) => {
    await route.fulfill({ json: { value: 47400, units: "pascal" } });
  });

  await page.route("**/api/flow/reynolds", async (route) => {
    await route.fulfill({ json: { value: 145000, units: "dimensionless" } });
  });

  await page.route("**/api/sizing/calculated-diameter", async (route) => {
    await route.fulfill({ json: { value: 0.0357, units: "meter" } });
  });

  await page.route("**/api/flow/friction-factor", async (route) => {
    await route.fulfill({ json: { value: 0.0215, units: "dimensionless" } });
  });

  await page.route("**/api/pump/headloss", async (route) => {
    await route.fulfill({ json: { value: 4.25, units: "meter" } });
  });

  await page.route("**/api/pump/npsh-available", async (route) => {
    await route.fulfill({ json: { head_loss: { value: 6.8, units: "meter" } } });
  });

  await page.route("**/api/pump/head", async (route) => {
    await route.fulfill({ json: { value: 18.2, units: "meter" } });
  });

  await page.goto("/exercises");
  await expect(page.getByRole("heading", { name: "Exercícios Integrados" })).toBeVisible();

  await page.getByRole("button", { name: /Abrir Alimentação de Reator/i }).click();
  await expect(page.getByText(/Uma linha de alimentação conduz/i)).toBeVisible();

  await page.getByRole("button", { name: /Consultar CoolProp/i }).click();
  await expect(page.getByText(/ρ = 971.80 kg\/m³/i)).toBeVisible();
  await expect(page.getByText(/μ = 0.000355 Pa·s/i)).toBeVisible();

  await page.getByRole("button", { name: /Próxima Etapa/i }).click();
  await page.locator("#reactor-feed-schedule").selectOption("SCH40");
  await page.locator("#reactor-feed-nps").selectOption("25");
  await page.getByRole("button", { name: /Calcular Reynolds/i }).click();
  await expect(page.getByText(/Re = 145000 \(Turbulento\)/i)).toBeVisible();
  await expect(page.getByText(/Di_real = 26.64 mm/i)).toBeVisible();
  await expect(page.getByText(/Di_calc = 35.7 mm/i)).toBeVisible();

  await page.getByRole("button", { name: /Próxima Etapa/i }).click();
  await page.locator("#reactor-feed-material").selectOption("Aço comercial");
  await page.getByRole("button", { name: /Calcular Perda de Carga/i }).click();
  await expect(page.getByText(/f = 0.0215/i)).toBeVisible();
  await expect(page.getByText(/ΔP = 4.250 m\.c\.l\./i)).toBeVisible();

  await page.getByRole("button", { name: /Próxima Etapa/i }).click();
  await page.getByRole("button", { name: /Calcular NPSH disponível/i }).click();
  await expect(page.getByText(/NPSH_disp = 6.800 m/i)).toBeVisible();

  await page.getByRole("button", { name: /Próxima Etapa/i }).click();
  await page.getByRole("button", { name: /Calcular Altura Manométrica/i }).click();
  await expect(page.getByText(/H_man = 18.200 m/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Concluir Exercício ✓/i })).toBeVisible();
});

test("balance recycle guided exercise completes in the browser", async ({ page }) => {
  await page.route("**/api/mass-balance/calculate", async (route) => {
    const body = route.request().postDataJSON() as {
      streams?: Array<{ name: string }>;
      splits?: Array<{ parent_stream: string; fraction: number }>;
    };

    if (body.streams?.some((stream) => stream.name === "Saida_Do_Reator")) {
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
              compositions: { A: 1, B: 0 },
            },
            Reciclo: {
              flow_rate: 60,
              compositions: { A: 0.24, B: 0.76 },
            },
            Produto: {
              flow_rate: 40,
              compositions: { A: 0.1, B: 0.9 },
            },
          },
        },
      });
      return;
    }

    if (body.streams?.some((stream) => stream.name === "Produto_SR")) {
      await route.fulfill({
        json: {
          results: {
            Alimentacao_Fresca: {
              flow_rate: 100,
              compositions: { A: 1, B: 0 },
            },
            Produto_SR: {
              flow_rate: 100,
              compositions: { A: 0.4, B: 0.6 },
            },
          },
        },
      });
      return;
    }

    throw new Error("Unhandled mass balance calculate request.");
  });

  await page.route("**/api/mass-balance/yields", async (route) => {
    await route.fulfill({
      json: {
        yields: {
          B_a_partir_de_A: 80,
        },
        results: {
          Produto: {
            flow_rate: 100,
            compositions: { A: 0.2, B: 0.8 },
          },
        },
      },
    });
  });

  await page.route("**/api/mass-balance/plot", async (route) => {
    await route.fulfill({
      json: {
        image_base64:
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=",
      },
    });
  });

  await page.goto("/exercises");
  await expect(page.getByRole("heading", { name: "Exercícios Integrados" })).toBeVisible();

  await page.getByRole("button", { name: /Abrir Balanço com Reciclo/i }).click();
  await expect(page.getByText(/100 kg\/h de A/i)).toBeVisible();
  await page.getByLabel(/X por passagem \(0-1\)/i).fill("0.6");
  await page.getByLabel(/Fração de reciclo f \(0-1\)/i).fill("0.5");
  await page.getByRole("button", { name: /Calcular Balanço/i }).click();
  await expect(page.getByText(/Produto: zA = 0.1000/i)).toBeVisible();
  await expect(page.getByText(/R = 0.600/i)).toBeVisible();

  await page.getByRole("button", { name: /Próxima Etapa/i }).click();
  await page.getByRole("button", { name: /Calcular sistema sem reciclo para comparação/i }).click();
  await expect(page.getByText(/Sem reciclo: zA = 0.4000/i)).toBeVisible();
  await expect(page.getByText(/Com reciclo: zA = 0.1000/i)).toBeVisible();
  await expect(page.getByText(/Redução de A: 30.00%/i)).toBeVisible();

  await page.getByRole("button", { name: /Próxima Etapa/i }).click();
  await page.getByRole("button", { name: /Calcular Rendimentos/i }).click();
  await expect(page.getByText(/Rendimento B←A \(com reciclo\) = 80.0 %/i)).toBeVisible();
  await expect(page.getByRole("img", { name: /Diagrama de correntes de massa/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Concluir Exercício ✓/i })).toBeVisible();
});

test("balance purge guided exercise completes in the browser", async ({ page }) => {
  await page.route("**/api/mass-balance/calculate", async (route) => {
    const body = route.request().postDataJSON() as {
      streams?: Array<{ name: string }>;
      splits?: Array<{ parent_stream: string; fraction: number }>;
    };

    if (body.streams?.some((stream) => stream.name === "Purga_Produto")) {
      const fraction =
        body.splits?.find((split) => split.parent_stream === "Saida_Do_Reator")?.fraction ?? 0.6;

      if (fraction > 0.95) {
        await route.fulfill({
          json: {
            metrics: {
              fresh_feed: 100,
              product_flow: 0.1,
              recycle_ratio: 0.999,
            },
            results: {
              Alimentacao_Fresca: {
                flow_rate: 100,
                compositions: { A: 0.8, B: 0, I: 0.2 },
              },
              Reciclo: {
                flow_rate: 99.9,
                compositions: { A: 0.05, B: 0.03, I: 0.92 },
              },
              Purga_Produto: {
                flow_rate: 0.1,
                compositions: { A: 0.05, B: 0.03, I: 0.92 },
              },
            },
          },
        });
        return;
      }

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
                compositions: { A: 0.8, B: 0, I: 0.2 },
              },
              Reciclo: {
                flow_rate: 60,
                compositions: { A: 0.1, B: 0.65, I: 0.25 },
              },
              Purga_Produto: {
              flow_rate: 40,
              compositions: { A: 0.1, B: 0.65, I: 0.25 },
            },
          },
        },
      });
      return;
    }

    throw new Error("Unhandled mass balance calculate request.");
  });

  await page.route("**/api/mass-balance/yields", async (route) => {
    await route.fulfill({
      json: {
        yields: {
          B_a_partir_de_A: 68,
        },
        results: {
          Purga_Produto: {
            flow_rate: 40,
            compositions: { A: 0.1, B: 0.65, I: 0.25 },
          },
        },
      },
    });
  });

  await page.route("**/api/mass-balance/plot", async (route) => {
    await route.fulfill({
      json: {
        image_base64:
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=",
      },
    });
  });

  await page.goto("/exercises");
  await expect(page.getByRole("heading", { name: "Exercícios Integrados" })).toBeVisible();

  await page.getByRole("button", { name: /Abrir Reciclo com Purga \(Inerte\)/i }).click();
  await expect(page.getByText(/Alimentação fresca: A = 0,8; I = 0,2/i)).toBeVisible();
  await page.getByRole("button", { name: /Simular sem purga/i }).click();
  await expect(page.getByText(/Sem purga: I no reciclo = 0.9200/i)).toBeVisible();

  await page.getByRole("button", { name: /Próxima Etapa/i }).click();
  await page.getByLabel(/Fração de reciclo f \(< 1\)/i).fill("0.6");
  await page.getByRole("button", { name: /Calcular com purga/i }).click();
  await expect(page.getByText(/I no reciclo = 0.2500/i)).toBeVisible();
  await expect(page.getByText(/I na purga = 0.2500/i)).toBeVisible();
  await expect(page.getByText(/R = 0.600/i)).toBeVisible();

  await page.getByRole("button", { name: /Próxima Etapa/i }).click();
  await page.getByRole("button", { name: /Calcular Rendimentos/i }).click();
  await expect(page.getByText(/Rendimento B←A = 68.0 %/i)).toBeVisible();
  await expect(page.getByRole("img", { name: /Diagrama de correntes de massa/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Concluir Exercício ✓/i })).toBeVisible();
});

test("series reactors guided exercise completes in the browser", async ({ page }) => {
  await page.route("**/api/reactor/plot-conversion-vs-volume", async (route) => {
    await route.fulfill({
      json: {
        image_base64:
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=",
      },
    });
  });

  await page.route("**/api/reactor/pfr", async (route) => {
    const body = route.request().postDataJSON() as { conversion?: number };
    const conversion = Number(body.conversion);

    if (conversion === 0.5) {
      await route.fulfill({
        json: {
          volume: { value: 0.0036, units: "m³" },
          residence_time: { value: 3.6, units: "s" },
          conversion: 0.5,
          limiting_reagent: "A",
        },
      });
      return;
    }

    if (conversion === 0.97) {
      await route.fulfill({
        json: {
          volume: { value: 0.00651, units: "m³" },
          residence_time: { value: 6.51, units: "s" },
          conversion: 0.97,
          limiting_reagent: "A",
        },
      });
      return;
    }

    throw new Error(`Unhandled PFR request for conversion ${conversion}`);
  });

  await page.route("**/api/reactor/cstr", async (route) => {
    const body = route.request().postDataJSON() as { conversion?: number };
    const conversion = Number(body.conversion);

    if (conversion === 0.5) {
      await route.fulfill({
        json: {
          volume: { value: 0.002, units: "m³" },
          residence_time: { value: 2.0, units: "s" },
          conversion: 0.5,
          limiting_reagent: "A",
        },
      });
      return;
    }

    if (conversion === 0.97) {
      await route.fulfill({
        json: {
          volume: { value: 0.03235, units: "m³" },
          residence_time: { value: 32.35, units: "s" },
          conversion: 0.97,
          limiting_reagent: "A",
        },
      });
      return;
    }

    throw new Error(`Unhandled CSTR request for conversion ${conversion}`);
  });

  await page.goto("/exercises");
  await expect(page.getByRole("heading", { name: "Exercícios Integrados" })).toBeVisible();

  await page.getByRole("button", { name: /Abrir Reatores em Série/i }).click();
  await expect(page.getByText(/PFR→CSTR/i)).toBeVisible();
  await expect(page.getByTestId("exercise-step-trail")).toBeVisible();
  await expect(page.locator('[data-testid="exercise-step-card"]')).toHaveCount(6);

  await page.getByRole("button", { name: /Gerar Gráfico de Levenspiel/i }).click();
  await expect(page.getByText(/Diagrama de Levenspiel/i)).toBeVisible();
  await expect(page.getByRole("img", { name: /Diagrama de Levenspiel/i })).toBeVisible();

  await page.getByRole("button", { name: /Próxima Etapa/i }).click();
  await page.locator("#series-reactors-xint").fill("0.5");
  await page.locator("#series-reactors-xfin").fill("0.97");
  await page.getByRole("button", { name: /Calcular V_PFR₁/i }).click();
  await expect(page.getByLabel(/X_final/i)).toHaveValue("0.97");
  await expect(page.getByRole("button", { name: /Calcular V_PFR₁/i })).toBeVisible();
});

test("exercises page surfaces an error when critical properties bootstrap fails", async ({ page }) => {
  await page.route("**/api/components/list", async (route) => {
    await route.fulfill({ json: ["Water", "n-Propane", "Methane"] });
  });

  await page.route("**/api/piping/schedules", async (route) => {
    await route.fulfill({
      json: [{ name: "SCH40", diameters: [25], description: "Schedule padrão." }],
    });
  });

  await page.route("**/api/piping/compositions", async (route) => {
    await route.fulfill({ json: ["Aço comercial"] });
  });

  await page.route("**/api/components/critical-properties", async (route) => {
    await route.fulfill({
      status: 400,
      json: { detail: "Falha no backend crítico" },
    });
  });

  await page.goto("/exercises");
  await expect(page.getByRole("heading", { name: "Exercícios Integrados" })).toBeVisible();
  await expect(
    page.getByText(/Erro ao carregar propriedades críticas: Falha no backend crítico/i),
  ).toBeVisible();
});

test("exercises page surfaces an error when the simple mass balance calculation fails", async ({
  page,
}) => {
  await page.route("**/api/components/list", async (route) => {
    await route.fulfill({ json: ["Water", "n-Propane", "Methane"] });
  });

  await page.route("**/api/piping/schedules", async (route) => {
    await route.fulfill({
      json: [{ name: "SCH40", diameters: [25], description: "Schedule padrão." }],
    });
  });

  await page.route("**/api/piping/compositions", async (route) => {
    await route.fulfill({ json: ["Aço comercial"] });
  });

  await page.route("**/api/components/critical-properties", async (route) => {
    await route.fulfill({
      json: {
        critical_temperature: 647.1,
        critical_pressure: 22064000,
      },
    });
  });

  await page.route("**/api/mass-balance/example", async (route) => {
    await route.fulfill({
      json: {
        components: ["A", "B", "C"],
        streams: [
          {
            name: "Feed",
            direction: 1,
            flow_rate: 100,
            compositions: { A: 1, B: 0, C: 0 },
          },
          {
            name: "Product",
            direction: -1,
            flow_rate: null,
            compositions: { A: null, B: null, C: null },
          },
        ],
        reactions: [
          {
            stoichiometry: { A: -1, B: 1 },
            key_component: "A",
            conversion: 0.4,
          },
        ],
        splits: [],
      },
    });
  });

  await page.route("**/api/mass-balance/calculate", async (route) => {
    await route.fulfill({
      status: 400,
      json: { detail: "Falha no backend do balanço simples" },
    });
  });

  await page.goto("/exercises");
  await expect(page.getByRole("heading", { name: "Exercícios Integrados" })).toBeVisible();

  await page.getByRole("button", { name: /Abrir Balanço de Massa Simples/i }).click();
  await page.getByRole("button", { name: /Calcular Balanço/i }).click();

  await expect(
    page.getByText(/Erro ao executar o exercício: Falha no backend do balanço simples/i),
  ).toBeVisible();
});
