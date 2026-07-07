export type FlowExamplePayload = {
  reynolds: {
    characteristic_diameter: number;
    velocity: number;
    density: number;
    dynamic_viscosity: number;
  };
  friction: {
    method: string;
    roughness_source: "custom" | "composition";
    composition: string;
    diameter_source: "custom" | "schedule";
    custom_diameter: number;
  };
};

export type FlowExampleFormInputs = {
  reynolds: {
    characteristicDiameter: string;
    velocity: string;
    density: string;
    dynamicViscosity: string;
  };
  friction: {
    method: string;
    composition: string;
    customDiameter: string;
  };
  roughnessSource: FlowExamplePayload["friction"]["roughness_source"];
  diameterSource: FlowExamplePayload["friction"]["diameter_source"];
};

function toInputValue(value: number) {
  return String(value);
}

export function mapFlowExampleToFormInputs(example: FlowExamplePayload): FlowExampleFormInputs {
  return {
    reynolds: {
      characteristicDiameter: toInputValue(example.reynolds.characteristic_diameter),
      velocity: toInputValue(example.reynolds.velocity),
      density: toInputValue(example.reynolds.density),
      dynamicViscosity: toInputValue(example.reynolds.dynamic_viscosity),
    },
    friction: {
      method: example.friction.method,
      composition: example.friction.composition,
      customDiameter: toInputValue(example.friction.custom_diameter),
    },
    roughnessSource: example.friction.roughness_source,
    diameterSource: example.friction.diameter_source,
  };
}
