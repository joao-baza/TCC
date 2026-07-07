import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { routes } from "@/app/router";
import { exerciseCatalog } from "@/features/exercises/catalog";

const fetchMock = vi.fn<typeof fetch>();
const notifyMock = vi.hoisted(() => ({ error: vi.fn() }));

vi.mock("@/lib/notify", () => ({
  notify: notifyMock,
}));

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderExercisesPage() {
  const router = createMemoryRouter(routes, { initialEntries: ["/exercises"] });
  render(<RouterProvider router={router} />);
}

function mockExerciseRequests(options?: {
  heatExchangerError?: string;
  heatExchangerDelayStep0?: boolean;
  balanceSimpleError?: string;
  criticalError?: string;
}) {
  let resolveHeatExchangerStep0: ((response: Response) => void) | null = null;
  const heatExchangerStep0Promise = options?.heatExchangerDelayStep0
    ? new Promise<Response>((resolve) => {
        resolveHeatExchangerStep0 = resolve;
      })
    : null;

  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.endsWith("/api/components/list") && method === "GET") {
      return Response.json(["Water", "n-Propane", "Methane"]);
    }

    if (url.endsWith("/api/piping/schedules") && method === "GET") {
      return Response.json([{ name: "SCH40", diameters: [25], description: "Schedule padrão." }]);
    }

    if (url.endsWith("/api/piping/compositions") && method === "GET") {
      return Response.json(["Aço comercial"]);
    }

    if (url.endsWith("/api/piping/schedule/SCH40/diameters") && method === "GET") {
      return Response.json({
        25: { nominal_diameter: 25, external_diameter: 33.4, units: "mm" },
      });
    }

    if (url.endsWith("/api/piping/schedule/SCH40/diameter/25") && method === "GET") {
      return Response.json({
        external_diameter: { value: 33.4, units: "millimeter" },
        thickness: { value: 3.38, units: "millimeter" },
        weight: { value: 2.5, units: "kilogram / meter" },
        max_pressure: { value: 1013250, units: "pascal" },
      });
    }

    if (url.endsWith("/api/piping/composition/A%C3%A7o%20comercial") && method === "GET") {
      return Response.json({
        name: "Aço comercial",
        specifications: {
          roughness: { value: 0.045, units: "millimeter" },
        },
      });
    }

    if (url.endsWith("/api/components/property") && method === "POST") {
      const body = JSON.parse(String(init?.body));

      if (
        options?.heatExchangerError &&
        body.fluid === "n-Propane" &&
        body.property_name === "H" &&
        body.temperature === 298.15
      ) {
        return new Response(JSON.stringify({ detail: options.heatExchangerError }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (body.property_name === "H" && body.temperature === 298.15) {
        if (heatExchangerStep0Promise && resolveHeatExchangerStep0) {
          const response = await heatExchangerStep0Promise;
          return response;
        }
        return Response.json({ value: 120000, units: "J/kg" });
      }

      if (body.property_name === "Q" && body.temperature === 298.15) {
        return Response.json({ value: -1, units: "" });
      }

      if (body.property_name === "C" && body.temperature === 298.15) {
        return Response.json({ value: 2300, units: "J/kg/K" });
      }

      if (body.property_name === "H" && body.temperature === 353.15) {
        return Response.json({ value: 210000, units: "J/kg" });
      }

      if (body.property_name === "Q" && body.temperature === 353.15) {
        return Response.json({ value: -1, units: "" });
      }

      if (body.property_name === "D" && body.temperature === 353.15) {
        return Response.json({ value: 971.8, units: "kg/m3" });
      }

      if (body.property_name === "V" && body.temperature === 353.15) {
        return Response.json({ value: 0.000355, units: "Pa·s" });
      }

      if (body.property_name === "C" && body.temperature === 353.15) {
        return Response.json({ value: 4190, units: "J/kg/K" });
      }

      if (body.property_name === "L" && body.temperature === 353.15) {
        return Response.json({ value: 0.67, units: "W/m/K" });
      }

      if (body.fluid === "Water" && body.property_name === "H" && body.temperature === 773.15) {
        return Response.json({ value: 3450000, units: "J/kg" });
      }

      if (body.fluid === "Water" && body.property_name === "S" && body.temperature === 773.15) {
        return Response.json({ value: 7100, units: "J/kg/K" });
      }
    }

    if (url.endsWith("/api/components/props-by-state") && method === "POST") {
      const body = JSON.parse(String(init?.body));

      if (
        body.fluid === "Water" &&
        body.input1 === "P" &&
        body.value1 === 10000 &&
        body.input2 === "S" &&
        body.value2 === 7100 &&
        body.output === "H"
      ) {
        return Response.json({ value: 2500000, units: "J/kg" });
      }

      if (
        body.fluid === "Water" &&
        body.input1 === "P" &&
        body.value1 === 10000 &&
        body.input2 === "S" &&
        body.value2 === 7100 &&
        body.output === "Q"
      ) {
        return Response.json({ value: 0.88, units: "dimensionless" });
      }

      if (
        body.fluid === "Water" &&
        body.input1 === "P" &&
        body.value1 === 10000 &&
        body.input2 === "Q" &&
        body.value2 === 0 &&
        body.output === "H"
      ) {
        return Response.json({ value: 191000, units: "J/kg" });
      }

      if (
        body.fluid === "Water" &&
        body.input1 === "P" &&
        body.value1 === 10000 &&
        body.input2 === "Q" &&
        body.value2 === 0 &&
        body.output === "S"
      ) {
        return Response.json({ value: 649, units: "J/kg/K" });
      }

      if (
        body.fluid === "Water" &&
        body.input1 === "P" &&
        body.value1 === 10000 &&
        body.input2 === "Q" &&
        body.value2 === 0 &&
        body.output === "T"
      ) {
        return Response.json({ value: 318.95, units: "K" });
      }

      if (
        body.fluid === "Water" &&
        body.input1 === "P" &&
        body.value1 === 3000000 &&
        body.input2 === "S" &&
        body.value2 === 649 &&
        body.output === "H"
      ) {
        return Response.json({ value: 194000, units: "J/kg" });
      }

      return Response.json({ value: 47400, units: "pascal" });
    }

    if (url.endsWith("/api/components/critical-properties") && method === "POST") {
      if (options?.criticalError) {
        return new Response(JSON.stringify({ detail: options.criticalError }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      return Response.json({
        critical_temperature: 647.1,
        critical_temperature_units: "kelvin",
        critical_pressure: 22064000,
        critical_pressure_units: "pascal",
        critical_density: 322,
        critical_density_units: "kilogram / meter ** 3",
      });
    }

    if (url.endsWith("/api/flow/reynolds") && method === "POST") {
      return Response.json({ value: 145000, units: "dimensionless" });
    }

    if (url.endsWith("/api/sizing/calculated-diameter") && method === "POST") {
      return Response.json({ value: 0.0357, units: "meter" });
    }

    if (url.endsWith("/api/flow/friction-factor") && method === "POST") {
      return Response.json({ value: 0.0215, units: "dimensionless" });
    }

    if (url.endsWith("/api/pump/headloss") && method === "POST") {
      return Response.json({ value: 4.25, units: "meter" });
    }

    if (url.endsWith("/api/pump/npsh-available") && method === "POST") {
      return Response.json({
        head_loss: { value: 6.8, units: "meter" },
      });
    }

    if (url.endsWith("/api/pump/head") && method === "POST") {
      return Response.json({ value: 18.2, units: "meter" });
    }

    if (url.endsWith("/api/mass-balance/calculate") && method === "POST") {
      const body = JSON.parse(String(init?.body));

      if (
        options?.balanceSimpleError &&
        body.streams?.some((stream: { name: string }) => stream.name === "Produto") &&
        !body.streams?.some((stream: { name: string }) => stream.name === "Saida_Do_Reator") &&
        !body.streams?.some((stream: { name: string }) => stream.name === "Purga_Produto")
      ) {
        return new Response(JSON.stringify({ detail: options.balanceSimpleError }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (body.streams?.some((stream: { name: string }) => stream.name === "Purga_Produto")) {
        const fraction =
          body.splits?.find((split: { parent_stream: string }) => split.parent_stream === "Saida_Do_Reator")
            ?.fraction ?? 0.6;

        if (fraction > 0.95) {
          return Response.json({
            metricas: {
              alimentacao_fresca: 100,
              vazao_produto: 0.1,
              taxa_reciclo: 0.999,
            },
            resultados: {
              Alimentacao_Fresca: {
                vazao: 100,
                composicoes: { A: 0.8, B: 0, I: 0.2 },
              },
              Reciclo: {
                vazao: 99.9,
                composicoes: { A: 0.05, B: 0.03, I: 0.92 },
              },
              Purga_Produto: {
                vazao: 0.1,
                composicoes: { A: 0.05, B: 0.03, I: 0.92 },
              },
            },
          });
        }

        return Response.json({
          metricas: {
            alimentacao_fresca: 100,
            vazao_produto: 40,
            taxa_reciclo: 0.6,
          },
          resultados: {
            Alimentacao_Fresca: {
              vazao: 100,
              composicoes: { A: 0.8, B: 0, I: 0.2 },
            },
            Reciclo: {
              vazao: 60,
              composicoes: { A: 0.1, B: 0.65, I: 0.25 },
            },
            Purga_Produto: {
              vazao: 40,
              composicoes: { A: 0.1, B: 0.65, I: 0.25 },
            },
          },
        });
      }

      if (body.streams?.some((stream: { name: string }) => stream.name === "Saida_Do_Reator")) {
        return Response.json({
          metricas: {
            alimentacao_fresca: 100,
            vazao_produto: 40,
            taxa_reciclo: 0.6,
          },
          resultados: {
            Alimentacao_Fresca: {
              vazao: 100,
              composicoes: { A: 1, B: 0 },
            },
            Reciclo: {
              vazao: 60,
              composicoes: { A: 0.24, B: 0.76 },
            },
            Produto: {
              vazao: 40,
              composicoes: { A: 0.1, B: 0.9 },
            },
          },
        });
      }

      if (body.streams?.some((stream: { name: string }) => stream.name === "Produto_SR")) {
        return Response.json({
          resultados: {
            Alimentacao_Fresca: {
              vazao: 100,
              composicoes: { A: 1, B: 0 },
            },
            Produto_SR: {
              vazao: 100,
              composicoes: { A: 0.4, B: 0.6 },
            },
          },
        });
      }

      return Response.json({
        metricas: {
          alimentacao_fresca: 100,
          vazao_produto: 100,
        },
        resultados: {
          Alimentacao_Fresca: {
            vazao: 100,
            composicoes: { A: 1, B: 0 },
          },
          Produto: {
            vazao: 100,
            composicoes: { A: 0.2, B: 0.8 },
          },
        },
      });
    }

    if (url.endsWith("/api/mass-balance/yields") && method === "POST") {
      const body = JSON.parse(String(init?.body));

      if (body.streams?.some((stream: { name: string }) => stream.name === "Purga_Produto")) {
        return Response.json({
          rendimentos: {
            B_a_partir_de_A: 68,
          },
          resultados: {
            Purga_Produto: {
              vazao: 40,
              composicoes: { A: 0.1, B: 0.65, I: 0.25 },
            },
          },
        });
      }

      return Response.json({
        rendimentos: {
          B_a_partir_de_A: 80,
        },
        resultados: {
          Produto: {
            vazao: 100,
            composicoes: { A: 0.2, B: 0.8 },
          },
        },
      });
    }

    if (url.endsWith("/api/mass-balance/plot") && method === "POST") {
      return Response.json({
        image_base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=",
      });
    }

    if (url.endsWith("/api/reactor/pfr") && method === "POST") {
      const body = JSON.parse(String(init?.body));
      const conversion = Number(body.conversion);

      if (conversion === 0.5) {
        return Response.json({
          volume: { value: 0.0036, units: "m³" },
          residence_time: { value: 3.6, units: "s" },
          conversion: 0.5,
          limiting_reagent: "A",
        });
      }

      if (conversion === 0.97) {
        return Response.json({
          volume: { value: 0.00651, units: "m³" },
          residence_time: { value: 6.51, units: "s" },
          conversion: 0.97,
          limiting_reagent: "A",
        });
      }
    }

    if (url.endsWith("/api/reactor/plot-conversion-vs-volume") && method === "POST") {
      return Response.json({
        image_base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=",
      });
    }

    if (url.endsWith("/api/reactor/cstr") && method === "POST") {
      const body = JSON.parse(String(init?.body));
      const conversion = Number(body.conversion);

      if (conversion === 0.5) {
        return Response.json({
          volume: { value: 0.002, units: "m³" },
          residence_time: { value: 2.0, units: "s" },
          conversion: 0.5,
          limiting_reagent: "A",
        });
      }

      if (conversion === 0.97) {
        return Response.json({
          volume: { value: 0.03235, units: "m³" },
          residence_time: { value: 32.35, units: "s" },
          conversion: 0.97,
          limiting_reagent: "A",
        });
      }
    }

    throw new Error(`Unhandled request: ${method} ${url}`);
  });

  return {
    resolveHeatExchangerStep0: (response: Response) => resolveHeatExchangerStep0?.(response),
  };
}

describe("ExercisesPage", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    notifyMock.error.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the full legacy exercise catalog and starts the heat exchanger runner", async () => {
    mockExerciseRequests();
    renderExercisesPage();

    expect(
      await screen.findByRole("heading", { name: /Exercícios Integrados/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Trocador de Calor/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Alimentação de Reator/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Reciclo com Purga \(Inerte\)/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /Abrir Trocador de Calor/i }));

    expect(await screen.findByText(/Um trocador de calor opera com/i)).toBeInTheDocument();
    expect(screen.getByTestId("heat-exchanger-thermal-charts")).toBeInTheDocument();
    expect(screen.getByText(/Curvas compostas e perfil térmico/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Etapa 1 — Entalpia de entrada/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("n-Propane")).toBeInTheDocument();
  });

  it("keeps all legacy exercises visible in the catalog with their configured step counts", async () => {
    mockExerciseRequests();
    renderExercisesPage();

    expect(
      await screen.findByRole("heading", { name: /Exercícios Integrados/i }),
    ).toBeInTheDocument();

    for (const exercise of exerciseCatalog) {
      expect(
        screen.getByRole("button", {
          name: new RegExp(`Abrir ${escapeRegExp(exercise.title)}`, "i"),
        }),
      ).toBeInTheDocument();
    }

    expect(
      screen
        .getAllByRole("button", { name: /^Abrir /i })
        .filter((button) => button.getAttribute("aria-label") !== "Abrir navegação"),
    ).toHaveLength(exerciseCatalog.length);

    const stepCounts = new Set(exerciseCatalog.map((exercise) => exercise.stepCount));
    for (const stepCount of stepCounts) {
      const expectedCount = exerciseCatalog.filter((exercise) => exercise.stepCount === stepCount).length;
      expect(screen.getAllByText(new RegExp(`^${stepCount} etapas$`, "i"))).toHaveLength(
        expectedCount,
      );
    }
  });

  it("runs the heat exchanger guided flow through the three legacy steps", async () => {
    const controls = mockExerciseRequests({ heatExchangerDelayStep0: true });
    renderExercisesPage();

    expect(
      await screen.findByRole("heading", { name: /Exercícios Integrados/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Abrir Trocador de Calor/i }));

    fireEvent.click(screen.getByRole("button", { name: /Calcular h₁ via CoolProp/i }));
    expect(await screen.findByRole("button", { name: /Calculando\.\.\./i })).toBeInTheDocument();
    controls.resolveHeatExchangerStep0(Response.json({ value: 120000, units: "J/kg" }));
    expect(await screen.findByText(/h₁ = 120000.0 J\/kg/i)).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Recalcular/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Entalpia de entrada obtida\. Agora precisamos da entalpia na saída/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Próxima Etapa/i }));
    expect(await screen.findByRole("heading", { name: /Etapa 2 — Entalpia de saída/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Calcular h₂ via CoolProp/i }));
    expect(await screen.findByText(/h₂ = 210000.0 J\/kg/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Próxima Etapa/i }));
    expect(await screen.findByRole("heading", { name: /Etapa 3 — Potência do trocador/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Calcular Q̇/i }));
    expect(await screen.findByText(/Q̇ = 135.00 kW/i)).toBeInTheDocument();
    expect(screen.getByText(/135.00 kW fornecidos/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Concluir Exercício ✓/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Concluir Exercício ✓/i }));
    expect(await screen.findByText(/Exercício concluído!/i)).toBeInTheDocument();
    expect(
      await screen.findByText((_, element) =>
        element?.tagName === "P" &&
        element.textContent?.includes("Você completou todas as etapas de Trocador de Calor") === true,
      ),
    ).toBeInTheDocument();
  });

  it("resets guided exercise forms when reopening an exercise from the catalog", async () => {
    mockExerciseRequests();
    renderExercisesPage();

    expect(
      await screen.findByRole("heading", { name: /Exercícios Integrados/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Abrir Trocador de Calor/i }));
    fireEvent.change(screen.getByLabelText(/^Fluido$/i), {
      target: { value: "Water" },
    });

    expect(screen.getByDisplayValue("Water")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Voltar aos exercícios/i }));
    fireEvent.click(screen.getByRole("button", { name: /Abrir Trocador de Calor/i }));

    expect(screen.getByDisplayValue("n-Propane")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Water")).not.toBeInTheDocument();
  });

  it("does not carry a previous exercise's state into a different exercise flow", async () => {
    mockExerciseRequests();
    renderExercisesPage();

    expect(
      await screen.findByRole("heading", { name: /Exercícios Integrados/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Abrir Trocador de Calor/i }));
    fireEvent.change(screen.getByLabelText(/^Fluido$/i), {
      target: { value: "Water" },
    });
    expect(screen.getByDisplayValue("Water")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Voltar aos exercícios/i }));
    fireEvent.click(screen.getByRole("button", { name: /Abrir Alimentação de Reator/i }));
    expect(await screen.findByText(/Uma linha de alimentação conduz/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Voltar aos exercícios/i }));
    fireEvent.click(screen.getByRole("button", { name: /Abrir Trocador de Calor/i }));

    expect(screen.getByDisplayValue("n-Propane")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Water")).not.toBeInTheDocument();
  });

  it("runs the reactor feed guided flow through the five legacy steps", async () => {
    mockExerciseRequests();
    renderExercisesPage();

    expect(
      await screen.findByRole("heading", { name: /Exercícios Integrados/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Abrir Alimentação de Reator/i }));

    expect(await screen.findByText(/Uma linha de alimentação conduz/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Consultar CoolProp/i }));
    expect(await screen.findByText(/ρ = 971.80 kg\/m³/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Próxima Etapa/i }));
    fireEvent.change(screen.getByLabelText(/^Schedule$/i), {
      target: { value: "SCH40" },
    });
    expect(await screen.findByRole("option", { name: "25" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Diâmetro nominal \(DN\)/i), {
      target: { value: "25" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular Reynolds/i }));
    expect(await screen.findByText(/Re = 145000/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Próxima Etapa/i }));
    fireEvent.change(screen.getByLabelText(/Material da tubulação/i), {
      target: { value: "Aço comercial" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular Perda de Carga/i }));
    expect(await screen.findByText(/ΔP = 4.250 m\.c\.l\./i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Próxima Etapa/i }));
    fireEvent.click(screen.getByRole("button", { name: /Calcular NPSH disponível/i }));
    expect(await screen.findByText(/NPSH_disp = 6.800 m/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Próxima Etapa/i }));
    fireEvent.click(screen.getByRole("button", { name: /Calcular Altura Manométrica/i }));
    expect(await screen.findByText(/H_man = 18.200 m/i)).toBeInTheDocument();
  });

  it("runs the simple mass balance guided flow through the two legacy steps", async () => {
    mockExerciseRequests();
    renderExercisesPage();

    expect(
      await screen.findByRole("heading", { name: /Exercícios Integrados/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Abrir Balanço de Massa Simples/i }));

    expect(await screen.findByText(/100 kg\/h de A puro/i)).toBeInTheDocument();
    expect(screen.getByTestId("exercise-step-trail")).toBeInTheDocument();
    const simpleTrailCards = screen.getAllByTestId("exercise-step-card");
    expect(simpleTrailCards).toHaveLength(2);
    expect(simpleTrailCards[0]).toHaveAttribute("data-state", "active");
    expect(simpleTrailCards[1]).toHaveAttribute("data-state", "pending");
    fireEvent.change(screen.getByLabelText(/Conversão X \(0-1\)/i), {
      target: { value: "0.8" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular Balanço/i }));
    expect(await screen.findByText(/Produto: 100.00 kg\/h/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Sem reciclo, conversão global = conversão por passagem/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/zA = 0.2000/i)).toBeInTheDocument();
    expect(screen.getByText(/zB = 0.8000/i)).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Corrente/i })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /Alimentacao_Fresca/i })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /Produto/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Próxima Etapa/i }));
    expect(await screen.findByRole("heading", { name: /Etapa 2 — Rendimentos/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Calcular Rendimentos/i }));
    expect(await screen.findByText(/Rendimento B←A = 80.0 %/i)).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: /Diagrama de correntes de massa/i })).toBeInTheDocument();
    expect(
      await screen.findByText((_, element) =>
        element?.tagName === "P" &&
        element.textContent?.includes("Você completou todas as etapas de Balanço de Massa Simples") === true,
      ),
    ).toBeInTheDocument();
    const simpleCompletedTrailCards = screen.getAllByTestId("exercise-step-card");
    expect(simpleCompletedTrailCards).toHaveLength(2);
    expect(simpleCompletedTrailCards[0]).toHaveAttribute("data-state", "done");
    expect(simpleCompletedTrailCards[1]).toHaveAttribute("data-state", "done");
  });

  it("runs the recycle mass balance guided flow through the three legacy steps", async () => {
    mockExerciseRequests();
    renderExercisesPage();

    expect(
      await screen.findByRole("heading", { name: /Exercícios Integrados/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Abrir Balanço com Reciclo/i }));

    expect(await screen.findByText(/100 kg\/h de A/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/X por passagem \(0-1\)/i), {
      target: { value: "0.6" },
    });
    fireEvent.change(screen.getByLabelText(/Fração de reciclo f \(0-1\)/i), {
      target: { value: "0.5" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular Balanço/i }));
    expect(await screen.findByText(/Produto: zA = 0.1000/i)).toBeInTheDocument();
    expect(screen.getByText(/R = 0.600/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Próxima Etapa/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /Calcular sistema sem reciclo para comparação/i }),
    );
    expect(await screen.findByText(/Sem reciclo: zA = 0.4000/i)).toBeInTheDocument();
    expect(screen.getByText(/Com reciclo: zA = 0.1000/i)).toBeInTheDocument();
    expect(screen.getByText(/Redução de A: 30.00%/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Próxima Etapa/i }));
    fireEvent.click(screen.getByRole("button", { name: /Calcular Rendimentos/i }));
    expect(await screen.findByText(/Rendimento B←A \(com reciclo\) = 80.0 %/i)).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: /Diagrama de correntes de massa/i })).toBeInTheDocument();
  });

  it("runs the purge mass balance guided flow through the three legacy steps", async () => {
    mockExerciseRequests();
    renderExercisesPage();

    expect(
      await screen.findByRole("heading", { name: /Exercícios Integrados/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Abrir Reciclo com Purga \(Inerte\)/i }));

    expect(await screen.findByText(/alimentação fresca: A = 0,8; I = 0,2/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Simular sem purga/i }));
    expect(await screen.findByText(/Sem purga: I no reciclo = 0.9200/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Próxima Etapa/i }));
    fireEvent.change(screen.getByLabelText(/Fração de reciclo f \(< 1\)/i), {
      target: { value: "0.6" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular com purga/i }));
    expect(await screen.findByText(/I no reciclo = 0.2500/i)).toBeInTheDocument();
    expect(screen.getByText(/I na purga = 0.2500/i)).toBeInTheDocument();
    expect(screen.getByText(/R = 0.600/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Próxima Etapa/i }));
    fireEvent.click(screen.getByRole("button", { name: /Calcular Rendimentos/i }));
    expect(await screen.findByText(/Rendimento B←A = 68.0 %/i)).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: /Diagrama de correntes de massa/i })).toBeInTheDocument();
  });

  it("runs the series reactors guided flow through the six legacy steps", async () => {
    mockExerciseRequests();
    renderExercisesPage();

    expect(
      await screen.findByRole("heading", { name: /Exercícios Integrados/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Abrir Reatores em Série/i }));

    expect(await screen.findByText(/PFR→CSTR/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Gerar Gráfico de Levenspiel/i }));
    expect(await screen.findByText(/Diagrama de Levenspiel/i)).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: /Diagrama de Levenspiel/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Próxima Etapa/i }));
    fireEvent.change(screen.getByLabelText(/X_int/i), {
      target: { value: "0.5" },
    });
    fireEvent.change(screen.getByLabelText(/X_final/i), {
      target: { value: "0.97" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular V_PFR₁/i }));
    expect(
      await screen.findByText(
        /Volume do primeiro PFR calculado\. Agora calculamos o CSTR que finaliza de X_int até X_final/i,
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Próxima Etapa/i }));
    expect(await screen.findByText(/V_PFR₁ = 0.00360 m³/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Calcular V_CSTR₂ e V_total/i }));
    expect(await screen.findByText(/V_CSTR₂ = 0.01567 m³/i)).toBeInTheDocument();
    expect(screen.getByText(/V_total = 0.01927 m³/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Próxima Etapa/i }));
    fireEvent.click(screen.getByRole("button", { name: /Calcular V_CSTR₁/i }));
    expect(await screen.findByText(/V_CSTR₁ = 0.00200 m³/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Próxima Etapa/i }));
    fireEvent.click(screen.getByRole("button", { name: /Calcular V_PFR₂ e V_total/i }));
    expect(await screen.findByText(/V_PFR₂ = 0.00291 m³/i)).toBeInTheDocument();
    expect(screen.getByText(/V_total = 0.00491 m³/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Próxima Etapa/i }));
    fireEvent.click(screen.getByRole("button", { name: /Ver comparação/i }));
    expect(await screen.findByText(/Melhor: CSTR→PFR/i)).toBeInTheDocument();
    expect(screen.getByText(/economia de 0.01436 m³/i)).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Configuração/i })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /PFR→CSTR/i })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /CSTR→PFR/i })).toBeInTheDocument();
    expect(screen.getByText(/Recomendado: CSTR→PFR/i)).toBeInTheDocument();
  });

  it("runs the rankine cycle guided flow through the five legacy steps", async () => {
    mockExerciseRequests();
    renderExercisesPage();

    expect(
      await screen.findByRole("heading", { name: /Exercícios Integrados/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Abrir Ciclo de Rankine/i }));

    expect(await screen.findByText(/vapor d'água/i)).toBeInTheDocument();
    expect(screen.getByTestId("exercise-step-trail")).toBeInTheDocument();
    const rankineTrailCards = screen.getAllByTestId("exercise-step-card");
    expect(rankineTrailCards).toHaveLength(5);
    expect(rankineTrailCards[0]).toHaveAttribute("data-state", "active");
    expect(rankineTrailCards[1]).toHaveAttribute("data-state", "pending");
    fireEvent.click(screen.getByRole("button", { name: /Calcular Estado 1 via CoolProp/i }));
    expect(await screen.findByText(/h₁ = 3450000.0 J\/kg/i)).toBeInTheDocument();
    expect(screen.getByText(/s₁ = 7100.00 J\/kg\/K/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Próxima Etapa/i }));
    fireEvent.click(screen.getByRole("button", { name: /Calcular h₂ \(P\+S → H\)/i }));
    expect(await screen.findByText(/h₂ = 2500000.0 J\/kg/i)).toBeInTheDocument();
    expect(screen.getByText(/X₂ = 0.880/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Próxima Etapa/i }));
    fireEvent.click(screen.getByRole("button", { name: /Calcular Estado 3 \(P\+Q=0\)/i }));
    expect(await screen.findByText(/h₃ = 191000.0 J\/kg/i)).toBeInTheDocument();
    expect(screen.getByText(/s₃ = 649.00 J\/kg\/K/i)).toBeInTheDocument();
    expect(screen.getByText(/T_cond = 45.8 °C/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Próxima Etapa/i }));
    fireEvent.click(screen.getByRole("button", { name: /Calcular h₄ \(P\+S → H\)/i }));
    expect(await screen.findByText(/h₄ = 194000.0 J\/kg/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Próxima Etapa/i }));
    fireEvent.click(screen.getByRole("button", { name: /Calcular Eficiência/i }));
    expect(await screen.findByText(/η = 29.1 %/i)).toBeInTheDocument();
    expect(screen.getByText(/η_Carnot = 58.7 %/i)).toBeInTheDocument();
    expect(screen.getByText(/η\/η_Carnot = 49.5 %/i)).toBeInTheDocument();
    expect(screen.getByText(/W_turbina/i)).toBeInTheDocument();
    expect(screen.getByText(/W_bomba/i)).toBeInTheDocument();
    expect(screen.getByText(/W_líquido/i)).toBeInTheDocument();
    expect(screen.getByText(/Q_caldeira/i)).toBeInTheDocument();
    expect(
      await screen.findByText((_, element) =>
        element?.tagName === "P" &&
        element.textContent?.includes("Você completou todas as etapas de Ciclo de Rankine") === true,
      ),
    ).toBeInTheDocument();
  });

  it("shows an error notification when the heat exchanger property lookup fails", async () => {
    mockExerciseRequests({ heatExchangerError: "Falha no backend do trocador" });
    renderExercisesPage();

    expect(
      await screen.findByRole("heading", { name: /Exercícios Integrados/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Abrir Trocador de Calor/i }));
    fireEvent.click(screen.getByRole("button", { name: /Calcular h₁ via CoolProp/i }));

    await waitFor(() => {
      expect(notifyMock.error).toHaveBeenCalledWith(
        "Erro ao executar o exercício: Falha no backend do trocador",
      );
    });
  });

  it("shows an error notification when the simple mass balance calculation fails", async () => {
    mockExerciseRequests({ balanceSimpleError: "Falha no backend do balanço simples" });
    renderExercisesPage();

    expect(
      await screen.findByRole("heading", { name: /Exercícios Integrados/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Abrir Balanço de Massa Simples/i }));
    fireEvent.click(screen.getByRole("button", { name: /Calcular Balanço/i }));

    await waitFor(() => {
      expect(notifyMock.error).toHaveBeenCalledWith(
        "Erro ao executar o exercício: Falha no backend do balanço simples",
      );
    });
  });

  it("shows an error notification when the rankine critical properties lookup fails", async () => {
    mockExerciseRequests({ criticalError: "Falha no backend crítico" });
    renderExercisesPage();

    expect(
      await screen.findByRole("heading", { name: /Exercícios Integrados/i }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(notifyMock.error).toHaveBeenCalledWith(
        "Erro ao carregar propriedades críticas: Falha no backend crítico",
      );
    });
  });

  it("shows a timeout warning when the heat exchanger request stalls", async () => {
    try {
      mockExerciseRequests({ heatExchangerDelayStep0: true });
      renderExercisesPage();

      expect(screen.getByRole("heading", { name: /Exercícios Integrados/i })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Abrir Trocador de Calor/i }));
      expect(await screen.findByRole("button", { name: /Calcular h₁ via CoolProp/i })).toBeInTheDocument();

      vi.useFakeTimers();
      act(() => {
        fireEvent.click(screen.getByRole("button", { name: /Calcular h₁ via CoolProp/i }));
        vi.advanceTimersByTime(30000);
      });

      expect(
        screen.getByText(/Tempo esgotado\. Verifique a conexão com a API\./i),
      ).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("ignores delayed exercise responses after the user switches flows", async () => {
    const controls = mockExerciseRequests({ heatExchangerDelayStep0: true });
    renderExercisesPage();

    expect(
      await screen.findByRole("heading", { name: /Exercícios Integrados/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Abrir Trocador de Calor/i }));
    fireEvent.click(screen.getByRole("button", { name: /Calcular h₁ via CoolProp/i }));
    expect(await screen.findByRole("button", { name: /Calculando\.\.\./i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Voltar aos exercícios/i }));
    fireEvent.click(screen.getByRole("button", { name: /Abrir Alimentação de Reator/i }));
    expect(await screen.findByText(/Uma linha de alimentação conduz/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Voltar aos exercícios/i }));
    fireEvent.click(screen.getByRole("button", { name: /Abrir Trocador de Calor/i }));

    controls.resolveHeatExchangerStep0(Response.json({ value: 120000, units: "J/kg" }));

    await waitFor(() => {
      expect(screen.queryByText(/h₁ = 120000.0 J\/kg/i)).not.toBeInTheDocument();
    });
  });
});
