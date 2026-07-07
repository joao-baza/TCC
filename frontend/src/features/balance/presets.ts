export const balanceWorkedExample = {
  components: ["A", "B", "C", "D"],
  streams: [
    {
      name: "Alimentacao_Fresca",
      direction: 1 as const,
      flow_rate: 100,
      compositions: { A: 0.8, B: 0.2, C: 0, D: 0 },
    },
    {
      name: "Saida_Do_Reator",
      direction: -1 as const,
      flow_rate: null,
      compositions: { A: null, B: null, C: null, D: null },
    },
    {
      name: "Reciclo",
      direction: 1 as const,
      flow_rate: null,
      compositions: { A: null, B: null, C: null, D: null },
    },
    {
      name: "Produto",
      direction: -1 as const,
      flow_rate: null,
      compositions: { A: null, B: null, C: null, D: null },
    },
  ],
  reactions: [
    {
      stoichiometry: { A: -1, C: 1 },
      key_component: "A",
      conversion: 0.7,
    },
  ],
  splits: [
    {
      parent_stream: "Saida_Do_Reator",
      recycle_stream: "Reciclo",
      purge_stream: "Produto",
      fraction: 0.6,
    },
  ],
};
