export type SelectOption = {
  value: string;
  label: string;
};

export type SelectOptionLike = string | SelectOption;

const FLUID_LABEL_TRANSLATIONS: Record<string, string> = {
  Water: "Água",
  Ethanol: "Etanol",
  Propane: "Propano",
  "n-Propane": "n-Propano",
  Methane: "Metano",
  Ethane: "Etano",
  Butane: "Butano",
  "n-Butane": "n-Butano",
  Hydrogen: "Hidrogênio",
  Oxygen: "Oxigênio",
  Nitrogen: "Nitrogênio",
  Air: "Ar",
  CarbonDioxide: "Dióxido de carbono",
  Ammonia: "Amônia",
};

function translateSelectLabel(value: string) {
  return FLUID_LABEL_TRANSLATIONS[value] ?? value;
}

export function toSelectOption(option: SelectOptionLike): SelectOption {
  if (typeof option === "string") {
    return { value: option, label: translateSelectLabel(option) };
  }

  return {
    value: option.value,
    label: option.label || translateSelectLabel(option.value),
  };
}

export function selectOptionValue(option: SelectOptionLike) {
  return typeof option === "string" ? option : option.value;
}
