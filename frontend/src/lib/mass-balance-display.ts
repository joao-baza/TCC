const streamDisplayNames: Record<string, string> = {
  Alimentacao_Fresca: "Alimentação",
  Saida_Do_Reator: "Saída do reator",
};

export const MASS_BALANCE_FLOW_UNIT_LABEL = "unidades consistentes";
export const MASS_BALANCE_FLOW_UNIT_EXPLANATION = "u. cons. = unidades consistentes";

export function formatMassBalanceStreamName(name: string) {
  return streamDisplayNames[name] ?? name;
}
