export const reactorWorkedExample = {
  cstr: {
    inputType: "conversion_and_kinetics",
    conversion: "0.8",
    rateConstant: "0.5",
    recyclingRatio: "0",
    components: [
      {
        state: "liquid",
        component_name: "A",
        flow_rate_inlet: "1.2",
        molar_concentration_inlet: "2.0",
      },
      {
        state: "liquid",
        component_name: "B",
        flow_rate_inlet: "0",
        molar_concentration_inlet: "0",
      },
    ],
    stoichiometricCoefficients: ["-1", "1"],
    reactionOrders: ["1", "0"],
  },
  pfr: {
    inputType: "conversion_and_kinetics",
    conversion: "0.8",
    rateConstant: "0.5",
    recyclingRatio: "0",
    components: [
      {
        state: "liquid",
        component_name: "A",
        flow_rate_inlet: "1.2",
        molar_concentration_inlet: "2.0",
      },
      {
        state: "liquid",
        component_name: "B",
        flow_rate_inlet: "0",
        molar_concentration_inlet: "0",
      },
    ],
    stoichiometricCoefficients: ["-1", "1"],
    reactionOrders: ["1", "0"],
  },
  plot: {
    rateConstant: "0.5",
    maxConversion: "0.95",
    activationEnergy: "55000",
    referenceTemperature: "298.15",
  },
} as const;
