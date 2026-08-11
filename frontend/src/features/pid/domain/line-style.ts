import type { ConnectionClass } from "./model";

export type LineStyle =
  | "supply-impulse"
  | "pneumatic-signal"
  | "hydraulic-signal"
  | "guided-electromagnetic-sonic"
  | "software-link"
  | "binary-pneumatic-signal"
  | "undefined-signal"
  | "electric-signal"
  | "capillary-tube"
  | "unguided-electromagnetic-sonic"
  | "mechanical-link"
  | "binary-electric-signal";

export const LINE_STYLES: readonly LineStyle[] = [
  "supply-impulse",
  "pneumatic-signal",
  "hydraulic-signal",
  "guided-electromagnetic-sonic",
  "software-link",
  "binary-pneumatic-signal",
  "undefined-signal",
  "electric-signal",
  "capillary-tube",
  "unguided-electromagnetic-sonic",
  "mechanical-link",
  "binary-electric-signal",
] as const;

export const LINE_STYLE_INFO: Record<LineStyle, { label: string; description: string }> = {
  "supply-impulse": { label: "Suprimento ou impulso", description: "Linha de suprimento, impulso ou tomada de instrumento." },
  "pneumatic-signal": { label: "Sinal pneumático", description: "Transmissão pneumática de instrumentação." },
  "hydraulic-signal": { label: "Sinal hidráulico", description: "Transmissão hidráulica de instrumentação." },
  "guided-electromagnetic-sonic": { label: "Sinal eletromagnético ou sônico guiado", description: "Sinal guiado por cabo, fibra ou guia físico." },
  "software-link": { label: "Ligação por software", description: "Ligação lógica ou por software entre sistemas." },
  "binary-pneumatic-signal": { label: "Sinal binário pneumático", description: "Sinal pneumático discreto/binário." },
  "undefined-signal": { label: "Sinal não-definido", description: "Meio de transmissão ainda não definido." },
  "electric-signal": { label: "Sinal elétrico", description: "Sinal elétrico ou eletrônico." },
  "capillary-tube": { label: "Tubo capilar", description: "Tubo capilar ou sistema preenchido." },
  "unguided-electromagnetic-sonic": { label: "Sinal eletromagnético ou sônico não-guiado", description: "Sinal sem guia físico, rádio ou acústico livre." },
  "mechanical-link": { label: "Ligação mecânica", description: "Acoplamento ou transmissão mecânica." },
  "binary-electric-signal": { label: "Sinal binário elétrico", description: "Sinal elétrico discreto/binário." },
};

export const CONNECTION_CLASS_INFO: Record<ConnectionClass, { label: string; description: string }> = {
  process: { label: "Processo", description: "Linha de fluido do processo produtivo principal" },
  utility: { label: "Utilidade", description: "Linha de serviço auxiliar (vapor, água, ar, etc.)" },
  signal: { label: "Sinal", description: "Conexão de instrumentação, controle ou transmissão de dados" },
};

export const DEFAULT_LINE_STYLE: Record<ConnectionClass, LineStyle> = {
  process: "supply-impulse",
  utility: "supply-impulse",
  signal: "electric-signal",
};
