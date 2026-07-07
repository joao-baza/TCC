export type FlowExamplePayload = {
  metadata: {
    fluid: string;
    pressure: number;
    regime: string;
  };
  reynolds: {
    characteristic_diameter: number;
    velocity: number;
    density: number;
    dynamic_viscosity: number;
  };
  friction: {
    method: string;
    roughness_source: "custom" | "composition";
    composition?: string;
    custom_roughness?: number;
    diameter_source: "custom" | "schedule";
    custom_diameter?: number;
    schedule?: string;
    schedule_diameter?: number;
  };
};

export type FlowPageExampleState = {
  reynoldsForm: {
    characteristicDiameter: string;
    velocity: string;
    density: string;
    dynamicViscosity: string;
    kinematicViscosity: string;
  };
  frictionForm: {
    method: string;
    customRoughness: string;
    composition: string;
    customDiameter: string;
    schedule: string;
    scheduleDiameter: string;
  };
  roughnessSource: "custom" | "composition";
  diameterSource: "custom" | "schedule";
  metadata: FlowExamplePayload["metadata"];
};

function toInputValue(value: number | undefined) {
  return value == null ? "" : String(value);
}

export function mapFlowExampleToFormState(example: FlowExamplePayload): FlowPageExampleState {
  return {
    metadata: example.metadata,
    reynoldsForm: {
      characteristicDiameter: toInputValue(example.reynolds.characteristic_diameter),
      velocity: toInputValue(example.reynolds.velocity),
      density: toInputValue(example.reynolds.density),
      dynamicViscosity: toInputValue(example.reynolds.dynamic_viscosity),
      kinematicViscosity: "",
    },
    frictionForm: {
      method: example.friction.method,
      customRoughness: toInputValue(example.friction.custom_roughness),
      composition: example.friction.composition ?? "",
      customDiameter: toInputValue(
        example.friction.custom_diameter ?? example.reynolds.characteristic_diameter,
      ),
      schedule: example.friction.schedule ?? "",
      scheduleDiameter: toInputValue(example.friction.schedule_diameter),
    },
    roughnessSource: example.friction.roughness_source,
    diameterSource: example.friction.diameter_source,
  };
}
