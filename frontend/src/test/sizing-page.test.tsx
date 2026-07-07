import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { routes } from "@/app/router";

const fetchMock = vi.fn<typeof fetch>();

function requestBodiesFor(pathSuffix: string, method = "POST") {
  return fetchMock.mock.calls
    .filter(([input, init]) => {
      const url = String(input);
      const requestMethod = init?.method ?? "GET";
      return url.endsWith(pathSuffix) && requestMethod === method;
    })
    .map(([, init]) => JSON.parse(String(init?.body ?? "{}")));
}

function renderSizingPage(initialEntry = "/sizing") {
  const router = createMemoryRouter(routes, { initialEntries: [initialEntry] });
  render(<RouterProvider router={router} />);
}

function getRowContaining(text: string | RegExp) {
  return screen
    .queryAllByText(text)
    .find((node) => node.closest("tr"))
    ?.closest("tr");
}

async function openSizingTab(name: string | RegExp) {
  fireEvent.click(screen.getByRole("tab", { name }));
  await waitFor(() => {
    expect(screen.getByRole("tab", { name })).toHaveAttribute("aria-selected", "true");
  });
}

async function expectRowValueMath(label: string | RegExp, expected?: string) {
  await waitFor(() => {
    const row = getRowContaining(label);
    const valueCell = row?.querySelector("td:nth-child(2)");

    expect(valueCell?.querySelector(".katex")).not.toBeNull();

    if (expected) {
      expect(valueCell).toHaveTextContent(expected);
    }
  });
}

function mockSizingRequests(options?: { delayRealDiameter?: boolean }) {
  let resolveRealDiameter: ((response: Response) => void) | undefined;

  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.endsWith("/api/piping/schedules") && method === "GET") {
      return new Response(
        JSON.stringify([
          { name: "STD", diameters: [25, 40], description: "Schedule padrao" },
          { name: "SCH80", diameters: [25, 40], description: "Schedule reforcado" },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (url.endsWith("/api/sizing/calculated-diameter") && method === "POST") {
      return new Response(JSON.stringify({ value: 126.16, units: "millimeter" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.endsWith("/api/sizing/real-diameter") && method === "POST") {
      if (options?.delayRealDiameter) {
        return new Promise<Response>((resolve) => {
          resolveRealDiameter = resolve;
        });
      }

      return new Response(JSON.stringify({ value: 150, units: "millimeter" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unhandled request: ${method} ${url}`);
  });

  return {
    resolveRealDiameter(response: Response) {
      resolveRealDiameter?.(response);
    },
  };
}

describe("SizingPage", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the didactic accordion titles for both sizing steps", async () => {
    mockSizingRequests();
    renderSizingPage("/sizing/calculated-diameter");

    expect(
      await screen.findByRole("button", { name: /Como funciona - Calculo de Diametro/i }),
    ).toBeInTheDocument();

    await openSizingTab(/Diâmetro Real/i);

    expect(
      screen.getByRole("button", { name: /Como funciona - Diametro Nominal Comercial/i }),
    ).toBeInTheDocument();
  });

  it("loads the worked example into the calculated diameter form", async () => {
    mockSizingRequests();
    renderSizingPage();

    await screen.findByRole("heading", { name: /Dimensionamento de Tubulação/i });
    fireEvent.click(screen.getByRole("button", { name: /Carregar exemplo/i }));

    expect(screen.getByLabelText(/Vazão/i)).toHaveValue(0.01);
    expect(screen.getByLabelText(/Velocidade de projeto/i)).toHaveValue(1.5);
  });

  it("shows the exploratory panel and applies a template", async () => {
    mockSizingRequests();
    renderSizingPage("/sizing/exploratory");

    await screen.findByRole("heading", { name: /Dimensionamento de Tubulação/i });

    const template = screen.getByRole("combobox", { name: /Modo Exploratório/i });
    fireEvent.focus(template);
    fireEvent.change(template, { target: { value: "processo" } });
    fireEvent.keyDown(template, { key: "Enter", code: "Enter" });

    await openSizingTab(/Diâmetro Calculado/i);

    expect(screen.getByLabelText(/Vazão/i)).toHaveValue(0.01);
    expect(screen.getByLabelText(/Velocidade de projeto/i)).toHaveValue(1.5);
  });

  it("shows saved exploratory scenarios in the velocity profile chart", async () => {
    mockSizingRequests();
    renderSizingPage();

    expect(
      await screen.findByRole("heading", { name: /Dimensionamento de Tubulação/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Vazão/i), {
      target: { value: "0.01" },
    });
    fireEvent.change(screen.getByLabelText(/Velocidade de projeto/i), {
      target: { value: "1.5" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular diâmetro/i }));

    await expectRowValueMath(/^Diâmetro calculado$/i);

    await openSizingTab(/Modo Exploratório/i);

    const template = screen.getByRole("combobox", { name: /Modo Exploratório/i });
    fireEvent.focus(template);
    fireEvent.change(template, { target: { value: "processo" } });
    fireEvent.keyDown(template, { key: "Enter", code: "Enter" });

    fireEvent.click(screen.getByRole("button", { name: /Salvar cenário/i }));

    expect(await screen.findByText(/Comparação de cenários/i)).toBeInTheDocument();
    expect((await screen.findAllByText(/Q=0.01 m3\/s, v=1.5 m\/s/i)).length).toBeGreaterThan(0);
  });

  it("auto-calculates the real diameter when an exploratory slider changes and a schedule is selected", async () => {
    mockSizingRequests();
    renderSizingPage("/sizing/real-diameter");

    expect(
      await screen.findByRole("heading", { name: /Dimensionamento de Tubulação/i }),
    ).toBeInTheDocument();

    const schedule = screen.getByRole("combobox", { name: /Schedule/i });
    fireEvent.focus(schedule);
    fireEvent.change(schedule, { target: { value: "STD" } });
    fireEvent.keyDown(schedule, { key: "Enter", code: "Enter" });

    await openSizingTab(/Modo Exploratório/i);

    const template = screen.getByRole("combobox", { name: /Modo Exploratório/i });
    fireEvent.focus(template);
    fireEvent.change(template, { target: { value: "processo" } });
    fireEvent.keyDown(template, { key: "Enter", code: "Enter" });

    fireEvent.change(screen.getByRole("slider", { name: /Vazao/i }), {
      target: { value: "0.02" },
    });

    await waitFor(() => {
      expect(requestBodiesFor("/api/sizing/calculated-diameter")).toContainEqual({
        flow_rate: 0.02,
        velocity: 1.5,
      });
      expect(requestBodiesFor("/api/sizing/real-diameter")).toContainEqual({
        calculated_diameter: 126.16,
        schedule: "STD",
      });
    });
  });

  it("saves an exploratory scenario and shows it in the list", async () => {
    mockSizingRequests();
    renderSizingPage("/sizing/exploratory");

    await screen.findByRole("heading", { name: /Dimensionamento de Tubulação/i });

    const template = screen.getByRole("combobox", { name: /Modo Exploratório/i });
    fireEvent.focus(template);
    fireEvent.change(template, { target: { value: "processo" } });
    fireEvent.keyDown(template, { key: "Enter", code: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: /Salvar cenário/i }));

    expect(await screen.findByText(/Q=0.01/)).toBeInTheDocument();
  });

  it("loads schedules and completes the diameter sizing flow", async () => {
    mockSizingRequests();
    renderSizingPage();

    expect(
      await screen.findByRole("heading", { name: /Dimensionamento de Tubulação/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Vazão/i), {
      target: { value: "0.05" },
    });
    fireEvent.change(screen.getByLabelText(/Velocidade de projeto/i), {
      target: { value: "4" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular diâmetro/i }));

    await expectRowValueMath(/^Diâmetro calculado$/i);

    await openSizingTab(/Diâmetro Real/i);

    const schedule = screen.getByRole("combobox", { name: /Schedule/i });
    fireEvent.focus(schedule);
    fireEvent.change(schedule, { target: { value: "STD" } });
    fireEvent.keyDown(schedule, { key: "Enter", code: "Enter" });

    await expectRowValueMath(/^Diâmetro real$/i);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/sizing/calculated-diameter",
        expect.objectContaining({ method: "POST" }),
      );
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/sizing/real-diameter",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  it("auto-calculates the real diameter when a schedule is already selected", async () => {
    mockSizingRequests();
    renderSizingPage("/sizing/real-diameter");

    expect(
      await screen.findByRole("heading", { name: /Dimensionamento de Tubulação/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Diâmetro calculado/i), {
      target: { value: "126.16" },
    });

    const schedule = screen.getByRole("combobox", { name: /Schedule/i });
    fireEvent.focus(schedule);
    fireEvent.change(schedule, { target: { value: "STD" } });
    fireEvent.keyDown(schedule, { key: "Enter", code: "Enter" });

    await expectRowValueMath(/^Diâmetro real$/i);
    expect(
      fetchMock.mock.calls.some(([input]) => String(input).endsWith("/api/sizing/real-diameter")),
    ).toBe(true);
  });

  it("recalculates the real diameter when the schedule changes after a diameter is computed", async () => {
    mockSizingRequests();
    renderSizingPage("/sizing/real-diameter");

    expect(
      await screen.findByRole("heading", { name: /Dimensionamento de Tubulação/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Diâmetro calculado/i), {
      target: { value: "126.16" },
    });

    const schedule = screen.getByRole("combobox", { name: /Schedule/i });
    fireEvent.focus(schedule);
    fireEvent.change(schedule, { target: { value: "STD" } });
    fireEvent.keyDown(schedule, { key: "Enter", code: "Enter" });

    await expectRowValueMath(/^Diâmetro real$/i);

    fireEvent.focus(schedule);
    fireEvent.change(schedule, { target: { value: "SCH80" } });
    fireEvent.keyDown(schedule, { key: "Enter", code: "Enter" });

    await expectRowValueMath(/^Diâmetro real$/i);
    await waitFor(() => {
      expect(requestBodiesFor("/api/sizing/real-diameter")).toEqual(
        expect.arrayContaining([
          {
            calculated_diameter: 126.16,
            schedule: "STD",
          },
          {
            calculated_diameter: 126.16,
            schedule: "SCH80",
          },
        ]),
      );
    });
  });

  it("ignores delayed real-diameter responses after the schedule changes", async () => {
    const sizingRequests = mockSizingRequests({ delayRealDiameter: true });
    renderSizingPage("/sizing/real-diameter");

    expect(
      await screen.findByRole("heading", { name: /Dimensionamento de Tubulação/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Diâmetro calculado/i), {
      target: { value: "126.16" },
    });

    const schedule = screen.getByRole("combobox", { name: /Schedule/i });
    fireEvent.focus(schedule);
    fireEvent.change(schedule, { target: { value: "STD" } });
    fireEvent.keyDown(schedule, { key: "Enter", code: "Enter" });
    fireEvent.change(schedule, { target: { value: "" } });

    sizingRequests.resolveRealDiameter(
      Response.json({ value: 150, units: "millimeter" }),
    );

    await waitFor(() => {
      expect(getRowContaining(/^Diâmetro real$/i)).toBeUndefined();
    });
  });
});
