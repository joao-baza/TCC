export type SizingExamplePayload = {
  calculated_diameter: {
    flow_rate: number;
    velocity: number;
  };
  real_diameter: {
    calculated_diameter: number;
    schedule: string;
  };
};

export type SizingExampleFormInputs = {
  flowRate: string;
  velocity: string;
  calculatedDiameterInput: string;
  schedule: string;
};

export function mapSizingExampleToFormInputs(
  example: SizingExamplePayload,
): SizingExampleFormInputs {
  return {
    flowRate: String(example.calculated_diameter.flow_rate),
    velocity: String(example.calculated_diameter.velocity),
    calculatedDiameterInput: String(example.real_diameter.calculated_diameter),
    schedule: example.real_diameter.schedule,
  };
}
