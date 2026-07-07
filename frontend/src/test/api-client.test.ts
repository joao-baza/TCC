import { ApiClient } from "@/lib/api";

describe("ApiClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("prefixes all requests with /api and returns parsed JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = new ApiClient();
    const result = await client.get<{ ok: boolean }>("/components/compositions");

    expect(fetch).toHaveBeenCalledWith(
      "/api/components/compositions",
      expect.objectContaining({ method: "GET" }),
    );
    expect(result.ok).toBe(true);
  });

  it("extracts the FastAPI detail field from JSON error responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ detail: "Vazao invalida" }), {
          status: 422,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const client = new ApiClient();

    await expect(client.get("/x")).rejects.toMatchObject({
      message: "Vazao invalida",
      status: 422,
    });
  });

  it("falls back to the raw text when the error body is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Bad Gateway", { status: 502 })),
    );

    const client = new ApiClient();

    await expect(client.get("/x")).rejects.toEqual(
      expect.objectContaining({
        message: "Bad Gateway",
        status: 502,
      }),
    );
  });

  it("uses a Portuguese fallback when the error body is empty", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));

    const client = new ApiClient();

    await expect(client.get("/x")).rejects.toEqual(
      expect.objectContaining({
        message: "Resposta vazia da API.",
        status: 500,
      }),
    );
  });
});
