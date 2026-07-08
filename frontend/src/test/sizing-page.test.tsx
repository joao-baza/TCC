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
          { name: "SCH40", diameters: [25, 40], description: "Schedule comercial" },
          { name: "SCH80", diameters: [25, 40], description: "Schedule reforcado" },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (url.endsWith("/api/sizing/example") && method === "GET") {
      return Response.json({
        calculated_diameter: {
          flow_rate: 0.0166667,
          velocity: 1.5,
        },
        real_diameter: {
          calculated_diameter: 118.94,
          schedule: "SCH40",
        },
      });
    }

    if (url.endsWith("/api/sizing/calculated-diameter") && method === "POST") {
      return new Response(JSON.stringify({ value: 126.16, units: "millimeter" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.endsWith("/api/sizing/velocity-profile/chart") && method === "POST") {
      return Response.json({
        title: "Perfil de Velocidade - Duto Circular",
        regime: "turbulent",
        color: "#DC2626",
        label: "Turbulento",
        reynolds: 189240,
        arrows: [
          { x1: 55, y1: 22, x2: 260, y2: 22, tip: "260,22" },
          { x1: 55, y1: 70, x2: 315, y2: 70, tip: "315,70" },
        ],
        diameter_mm: 126.16,
        velocity: 4,
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

  it("loads the worked example and auto-calculates the derived sizing results from the calculated diameter tab", async () => {
    mockSizingRequests();
    renderSizingPage();

    await screen.findByRole("heading", { name: /Dimensionamento de Tubulação/i });
    fireEvent.click(screen.getByRole("button", { name: /Carregar exemplo/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Vazão/i)).toHaveValue(0.0166667);
      expect(screen.getByLabelText(/Velocidade de projeto/i)).toHaveValue(1.5);
    });

    await expectRowValueMath(/^Diâmetro calculado$/i);
    await expectRowValueMath(/^Diâmetro real$/i);
    expect(requestBodiesFor("/api/sizing/calculated-diameter")).toContainEqual({
      flow_rate: 0.0166667,
      velocity: 1.5,
    });
    expect(requestBodiesFor("/api/sizing/velocity-profile/chart")).toContainEqual({
      velocity: 1.5,
      diameter_mm: 126.16,
    });
    expect(requestBodiesFor("/api/sizing/real-diameter")).toContainEqual({
      calculated_diameter: 126.16,
      schedule: "SCH40",
    });
  });

  it("loads the worked example and exposes calculated and real diameter results when opening the subsequent tab", async () => {
    mockSizingRequests();
    renderSizingPage("/sizing/real-diameter");

    await screen.findByRole("heading", { name: /Dimensionamento de Tubulação/i });
    fireEvent.click(screen.getByRole("button", { name: /Carregar exemplo/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Diâmetro calculado/i)).toHaveValue(126.16);
      expect(screen.getByLabelText(/^Schedule$/i)).toHaveValue("SCH40");
    });

    await expectRowValueMath(/^Diâmetro real$/i);

    await openSizingTab(/Diâmetro Calculado/i);
    await expectRowValueMath(/^Diâmetro calculado$/i);
    expect(await screen.findByText(/Perfil de Velocidade - Duto Circular/i)).toBeInTheDocument();
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
    expect(requestBodiesFor("/api/sizing/velocity-profile/chart")).toContainEqual({
      velocity: 4,
      diameter_mm: 126.16,
    });
    expect(await screen.findByText(/Perfil de Velocidade - Duto Circular/i)).toBeInTheDocument();

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

  it("shows the selected schedule description below the selector before the result table", async () => {
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

    const description = await screen.findByText("Schedule padrao");
    const resultHeading = await screen.findByText("Resultado");

    expect(
      description.compareDocumentPosition(resultHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
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
