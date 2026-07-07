import { render, screen, waitFor } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { routes } from "@/app/router";

const fetchMock = vi.fn<typeof fetch>();

function mockPipingAndSizingRequests() {
  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.endsWith("/api/piping/compositions") && method === "GET") {
      return Response.json(["Aço comercial"]);
    }

    if (url.endsWith("/api/piping/schedules") && method === "GET") {
      return Response.json([
        { name: "SCH40", diameters: [25], description: "Schedule padrão." },
      ]);
    }

    if (url.endsWith("/api/piping/fittings") && method === "GET") {
      return Response.json(["Cotovelo 90° raio longo"]);
    }

    if (url.endsWith("/api/sizing/calculated-diameter") && method === "POST") {
      return Response.json({ value: 126.16, units: "millimeter" });
    }

    if (url.endsWith("/api/sizing/real-diameter") && method === "POST") {
      return Response.json({ value: 150, units: "millimeter" });
    }

    throw new Error(`Unhandled request: ${method} ${url}`);
  });
}

describe("route-backed tabs", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    mockPipingAndSizingRequests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects /piping to the default child tab and marks it selected", async () => {
    const router = createMemoryRouter(routes, { initialEntries: ["/piping"] });
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/piping/compositions");
    });

    expect(await screen.findByRole("tab", { selected: true })).toHaveTextContent("Composições");
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
  });

  it("redirects /sizing to the default child tab and keeps the panel visible", async () => {
    const router = createMemoryRouter(routes, { initialEntries: ["/sizing"] });
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/sizing/calculated-diameter");
    });

    expect(await screen.findByRole("tab", { selected: true })).toHaveTextContent(
      "Diâmetro Calculado",
    );
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
  });

  it("navigates directly to a child tab from the URL", async () => {
    const router = createMemoryRouter(routes, { initialEntries: ["/sizing/real-diameter"] });
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("tab", { selected: true })).toHaveTextContent(
      "Diâmetro Real",
    );
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
  });
});
