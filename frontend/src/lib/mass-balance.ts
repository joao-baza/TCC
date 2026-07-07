export type MassBalanceStreamResult = {
  vazao?: number;
  flow_rate?: number;
  composicoes?: Record<string, number>;
  compositions?: Record<string, number>;
};

export type MassBalanceResultsResponse = {
  metricas?: Record<string, number>;
  metrics?: Record<string, number>;
  resultados?: Record<string, MassBalanceStreamResult>;
  results?: Record<string, MassBalanceStreamResult>;
};

export type MassBalanceYieldResponse = {
  rendimentos?: Record<string, number>;
  yields?: Record<string, number>;
  resultados?: Record<string, MassBalanceStreamResult>;
  results?: Record<string, MassBalanceStreamResult>;
};

export type MassBalancePlotResponse = {
  imagem_base64?: string;
  image_base64?: string;
};

function humanizeKey(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatYieldKey(key: string) {
  const match = key.match(/^(.+?)(?:_from_|_a_partir_de_)(.+)$/);
  if (!match) {
    return humanizeKey(key);
  }

  const left = match[1].replace(/_/g, " ");
  const right = match[2].replace(/_/g, " ");
  return `${left} a partir de ${right}`;
}

export function getMassBalanceResults(response?: MassBalanceResultsResponse | MassBalanceYieldResponse | null) {
  return response?.resultados ?? response?.results ?? {};
}

export function getMassBalanceMetrics(response?: MassBalanceResultsResponse | null) {
  return response?.metricas ?? response?.metrics ?? {};
}

export function getMassBalanceYields(response?: MassBalanceYieldResponse | null) {
  return response?.rendimentos ?? response?.yields ?? {};
}

export function getMassBalancePlotImage(response?: MassBalancePlotResponse | null) {
  return response?.imagem_base64 ?? response?.image_base64 ?? null;
}

export function getMassBalanceStreamFlow(result?: MassBalanceStreamResult | null) {
  return result?.vazao ?? result?.flow_rate ?? 0;
}

export function getMassBalanceStreamCompositions(result?: MassBalanceStreamResult | null) {
  return result?.composicoes ?? result?.compositions ?? {};
}

export function formatMassBalanceMetricLabel(key: string) {
  const lowerKey = key.toLowerCase();

  if (lowerKey === "fresh_feed" || lowerKey === "alimentacao_fresca") {
    return "Alimentação fresca";
  }

  if (lowerKey === "product_flow" || lowerKey === "vazao_produto") {
    return "Vazão de produto";
  }

  if (lowerKey === "recycle_ratio" || lowerKey === "taxa_reciclo" || lowerKey === "razao_reciclo") {
    return "Taxa de reciclo";
  }

  return humanizeKey(key);
}

export function formatMassBalanceYieldLabel(key: string) {
  if (key.includes("_from_") || key.includes("_a_partir_de_")) {
    return formatYieldKey(key);
  }

  return humanizeKey(key);
}
