import {
  ApiError,
  buildApiUrl,
  createApiClient,
  getApiBaseUrl
} from "@/lib/api";

describe("api client", () => {
  it("uses the remote API in localhost development and same-origin proxy elsewhere", () => {
    expect(getApiBaseUrl("localhost")).toBe("https://tcc.api.homelab.sistemasj.com.br");
    expect(getApiBaseUrl("127.0.0.1")).toBe("https://tcc.api.homelab.sistemasj.com.br");
    expect(getApiBaseUrl("tcc.homelab.sistemasj.com.br")).toBe("/api");
  });

  it("builds endpoint URLs from the selected base path", () => {
    expect(buildApiUrl("/api", "/piping/compositions")).toBe("/api/piping/compositions");
  });

  it("serializes POST payloads and returns JSON data", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ value: 42 })
    });

    const api = createApiClient({
      baseUrl: "/api",
      fetchImpl: fetchMock
    });

    await expect(
      api.call("/sizing/calculated-diameter", "POST", {
        flow_rate: 0.25,
        velocity: 1.1
      })
    ).resolves.toEqual({ value: 42 });

    expect(fetchMock).toHaveBeenCalledWith("/api/sizing/calculated-diameter", {
      body: JSON.stringify({
        flow_rate: 0.25,
        velocity: 1.1
      }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      method: "POST"
    });
  });

  it("raises a typed ApiError when the backend returns a detail message", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ detail: "Falha na requisição à API" })
    });

    const api = createApiClient({
      baseUrl: "/api",
      fetchImpl: fetchMock
    });

    await expect(api.call("/pump/head", "GET")).rejects.toEqual(
      new ApiError("Falha na requisição à API")
    );
  });
});
