import type { ConnectionClass } from "./model";

export type LineStyle =
  | "solid-thick"
  | "solid-thin"
  | "pneumatic"
  | "dashed"
  | "hydraulic"
  | "capillary"
  | "guided-wave"
  | "unguided-wave"
  | "digital"
  | "mechanical"
  | "undefined";

export const LINE_STYLES: readonly LineStyle[] = [
  "solid-thick",
  "solid-thin",
  "pneumatic",
  "dashed",
  "hydraulic",
  "capillary",
  "guided-wave",
  "unguided-wave",
  "digital",
  "mechanical",
  "undefined",
] as const;

export const LINE_STYLE_INFO: Record<LineStyle, { label: string; description: string }> = {
  "solid-thick":     { label: "Contínua grossa",     description: "Tubulação principal de processo" },
  "solid-thin":      { label: "Contínua fina",       description: "Conexão ao processo, tomada de instrumento ou linha de impulso" },
  "pneumatic":       { label: "Sinal pneumático",    description: "Transmissão por ar comprimido (3-15 psi)" },
  "dashed":          { label: "Sinal elétrico",      description: "Sinal elétrico/eletrônico (4-20 mA, binário)" },
  "hydraulic":       { label: "Sinal hidráulico",    description: "Transmissão por fluido hidráulico pressurizado" },
  "capillary":       { label: "Tubo capilar",        description: "Sistema preenchido ou selo remoto com capilar" },
  "guided-wave":     { label: "Guiado (fibra/cabo)", description: "Sinal eletromagnético/sônico guiado (fibra óptica, cabo especial)" },
  "unguided-wave":   { label: "Não guiado (rádio)",  description: "Sinal sem fio, rádio ou comunicação não guiada" },
  "digital":         { label: "Digital/barramento",  description: "Comunicação digital, barramento ou link de dados entre sistemas" },
  "mechanical":      { label: "Ligação mecânica",    description: "Acoplamento mecânico entre dispositivos" },
  "undefined":       { label: "Sinal indefinido",    description: "Meio de transmissão não definido ou irrelevante" },
};

export const CONNECTION_CLASS_INFO: Record<ConnectionClass, { label: string; description: string }> = {
  "process":  { label: "Processo",  description: "Linha de fluido do processo produtivo principal" },
  "utility":  { label: "Utilidade", description: "Linha de serviço auxiliar (vapor, água, ar, etc.)" },
  "signal":   { label: "Sinal",     description: "Conexão de instrumentação, controle ou transmissão de dados" },
};

export const DEFAULT_LINE_STYLE: Record<ConnectionClass, LineStyle> = {
  "process": "solid-thick",
  "utility": "solid-thin",
  "signal": "dashed",
};
