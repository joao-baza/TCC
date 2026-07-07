export type ExerciseCatalogEntry = {
  id:
    | "heat-exchanger"
    | "reactor-feed"
    | "rankine"
    | "series-reactors"
    | "balance-simple"
    | "balance-recycle"
    | "balance-purge";
  title: string;
  description: string;
  stepCount: number;
  available: boolean;
};

export const exerciseCatalog: ExerciseCatalogEntry[] = [
  {
    id: "heat-exchanger",
    title: "Trocador de Calor",
    description:
      "Use propriedades termodinâmicas reais (CoolProp) para calcular o calor trocado por unidade de massa entre dois estados de um fluido.",
    stepCount: 3,
    available: true,
  },
  {
    id: "reactor-feed",
    title: "Alimentação de Reator",
    description:
      "Dimensione a tubulação e selecione a bomba para conduzir um fluido até um reator, encadeando CoolProp → Reynolds → Perda de carga → NPSH → Altura manométrica.",
    stepCount: 5,
    available: true,
  },
  {
    id: "rankine",
    title: "Ciclo de Rankine",
    description:
      "Calcule os 4 estados termodinâmicos do ciclo de Rankine para vapor d'água e determine a eficiência térmica do ciclo.",
    stepCount: 5,
    available: true,
  },
  {
    id: "series-reactors",
    title: "Reatores em Série",
    description:
      "Compare as configurações PFR→CSTR e CSTR→PFR para determinar qual requer menor volume total para uma dada conversão final.",
    stepCount: 6,
    available: true,
  },
  {
    id: "balance-simple",
    title: "Balanço de Massa Simples",
    description:
      "Resolva um balanço de massa para a reação A→B sem reciclo. Observe a relação entre conversão por passagem e a composição do produto.",
    stepCount: 2,
    available: true,
  },
  {
    id: "balance-recycle",
    title: "Balanço com Reciclo",
    description:
      "Demonstre como o reciclo aumenta a conversão global de A para além da conversão por passagem no reator.",
    stepCount: 3,
    available: true,
  },
  {
    id: "balance-purge",
    title: "Reciclo com Purga (Inerte)",
    description:
      "Demonstre como a presença de um inerte no feed exige purga para evitar acúmulo indefinido no circuito de reciclo.",
    stepCount: 3,
    available: true,
  },
];
