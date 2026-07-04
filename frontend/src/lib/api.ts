const LOCAL_API_BASE_URL = "https://tcc.api.homelab.sistemasj.com.br";
const SAME_ORIGIN_API_BASE_URL = "/api";

export type ValueWithUnits = {
  value: number;
  units: string;
};

export type ScheduleSummary = {
  name: string;
  diameters: number[];
  description: string;
};

export type DiameterSummary = {
  nominal_diameter: number;
  external_diameter: number;
  units: string;
};

export interface PropertyRecord {
  [key: string]: ValueWithUnits | string | number | null | PropertyRecord;
}

export interface EngineeringApi {
  getCompositions(): Promise<string[]>;
  getCompositionDetails(name: string): Promise<PropertyRecord>;
  getSchedules(): Promise<ScheduleSummary[]>;
  getScheduleDiameters(schedule: string): Promise<Record<string, DiameterSummary>>;
  getScheduleDiameterDetails(schedule: string, diameter: number | string): Promise<PropertyRecord>;
  getFittings(): Promise<string[]>;
  getFittingDetails(name: string): Promise<PropertyRecord>;
  calculateDiameter(flowRate: number | string, velocity: number | string): Promise<ValueWithUnits>;
  getRealDiameter(calculatedDiameter: number | string, schedule: string): Promise<ValueWithUnits>;
  getFrictionFactorMethods(): Promise<string[]>;
  getHydraulicDiameterShapes(): Promise<string[]>;
  calculateReynolds(params: Record<string, number>): Promise<ValueWithUnits>;
  calculateFrictionFactor(
    roughness: number | string,
    diameter: number | string,
    reynolds: number | string,
    method: string
  ): Promise<ValueWithUnits>;
  calculateHydraulicDiameter(params: Record<string, number | string>): Promise<ValueWithUnits>;
}

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export function getApiBaseUrl(hostname?: string) {
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return LOCAL_API_BASE_URL;
  }

  return SAME_ORIGIN_API_BASE_URL;
}

export function buildApiUrl(baseUrl: string, endpoint: string) {
  return `${baseUrl}${endpoint}`;
}

type HttpMethod = "GET" | "POST";

type FetchLike = typeof fetch;

type ApiClientOptions = {
  baseUrl?: string;
  fetchImpl?: FetchLike;
};

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl =
    options.baseUrl ??
    getApiBaseUrl(typeof window !== "undefined" ? window.location.hostname : undefined);
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async call<TResponse>(
      endpoint: string,
      method: HttpMethod = "GET",
      data?: unknown
    ): Promise<TResponse> {
      const response = await fetchImpl(buildApiUrl(baseUrl, endpoint), {
        method,
        headers: {
          Accept: "application/json",
          ...(data && method === "POST"
            ? {
                "Content-Type": "application/json"
              }
            : {})
        },
        ...(data && method === "POST"
          ? {
              body: JSON.stringify(data)
            }
          : {})
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { detail?: string };
        throw new ApiError(errorData.detail ?? "Falha na requisição à API");
      }

      return (await response.json()) as TResponse;
    },
    getCompositions() {
      return this.call<string[]>("/piping/compositions");
    },
    getCompositionDetails(name: string) {
      return this.call<PropertyRecord>(`/piping/composition/${name}`);
    },
    getSchedules() {
      return this.call<ScheduleSummary[]>("/piping/schedules");
    },
    getScheduleDiameters(schedule: string) {
      return this.call<Record<string, DiameterSummary>>(
        `/piping/schedule/${schedule}/diameters`
      );
    },
    getScheduleDiameterDetails(schedule: number | string, diameter: number | string) {
      return this.call<PropertyRecord>(
        `/piping/schedule/${schedule}/diameter/${diameter}`
      );
    },
    getFittings() {
      return this.call<string[]>("/piping/fittings");
    },
    getFittingDetails(name: string) {
      return this.call<PropertyRecord>(`/piping/fitting/${name}`);
    },
    calculateDiameter(flowRate: number | string, velocity: number | string) {
      return this.call<ValueWithUnits>("/sizing/calculated-diameter", "POST", {
        flow_rate: Number(flowRate),
        velocity: Number(velocity)
      });
    },
    getRealDiameter(calculatedDiameter: number | string, schedule: string) {
      return this.call<ValueWithUnits>("/sizing/real-diameter", "POST", {
        calculated_diameter: Number(calculatedDiameter),
        schedule
      });
    },
    getFrictionFactorMethods() {
      return this.call<string[]>("/flow/friction-factor/methods");
    },
    getHydraulicDiameterShapes() {
      return this.call<string[]>("/flow/hydraulic-diameter/shapes");
    },
    calculateReynolds(params: Record<string, number>) {
      return this.call<ValueWithUnits>("/flow/reynolds", "POST", params);
    },
    calculateFrictionFactor(
      roughness: number | string,
      diameter: number | string,
      reynolds: number | string,
      method: string
    ) {
      return this.call<ValueWithUnits>("/flow/friction-factor", "POST", {
        roughness: Number(roughness),
        diameter: Number(diameter),
        reynolds: Number(reynolds),
        method
      });
    },
    calculateHydraulicDiameter(params: Record<string, number | string>) {
      return this.call<ValueWithUnits>("/flow/hydraulic-diameter", "POST", params);
    }
  } satisfies EngineeringApi & {
    call<TResponse>(endpoint: string, method?: HttpMethod, data?: unknown): Promise<TResponse>;
  };
}

export const apiClient: EngineeringApi = createApiClient();
