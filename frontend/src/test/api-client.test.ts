import { ApiClient } from "@/lib/api";

describe("ApiClient", () => {
  it("prefixes all requests with /api and returns parsed JSON", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
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
});
