export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ApiClient {
  constructor(private readonly baseUrl = "/api") {}

  async get<T>(path: string) {
    return this.request<T>(path, { method: "GET" });
  }

  async post<T>(path: string, body: unknown) {
    return this.request<T>(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  private async request<T>(path: string, init: RequestInit) {
    const response = await fetch(`${this.baseUrl}${path}`, init);

    if (!response.ok) {
      const message = await response.text();
      throw new ApiError(message || "Request failed", response.status);
    }

    return (await response.json()) as T;
  }
}

export const apiClient = new ApiClient();
