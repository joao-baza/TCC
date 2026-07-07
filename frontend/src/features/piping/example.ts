export type PipingExamplePayload = {
  composition: string;
  schedule: string;
  diameter: number;
  fitting: string;
};

export type PipingExampleFormInputs = {
  composition: string;
  schedule: string;
  diameter: string;
  fitting: string;
};

export function mapPipingExampleToFormInputs(
  example: PipingExamplePayload,
): PipingExampleFormInputs {
  return {
    composition: example.composition,
    schedule: example.schedule,
    diameter: String(example.diameter),
    fitting: example.fitting,
  };
}
