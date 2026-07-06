export type ValueWithUnits = {
  value: number;
  units: string;
};

export interface PropertyRecord {
  [key: string]: ValueWithUnits | string | number | null | PropertyRecord;
}

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
      const message = await this.extractErrorMessage(response);
      throw new ApiError(message, response.status);
    }

    return (await response.json()) as T;
  }

  private async extractErrorMessage(response: Response): Promise<string> {
    const raw = await response.text();
    if (!raw) {
      return "Resposta vazia da API.";
    }

    try {
      const data = JSON.parse(raw) as {
        detail?: unknown;
      };

      if (typeof data.detail === "string" && data.detail.trim()) {
        return data.detail;
      }

      if (Array.isArray(data.detail) && data.detail.length > 0) {
        const first = data.detail[0] as { msg?: string };
        if (typeof first.msg === "string" && first.msg.trim()) {
          return first.msg;
        }
      }
    } catch {
      // Non-JSON responses should use the raw text body.
    }

    return raw;
  }
}

export const apiClient = new ApiClient();
