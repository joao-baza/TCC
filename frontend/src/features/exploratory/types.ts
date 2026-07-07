export type SliderConfig = {
  id: string;
  field: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  default: number;
  linkedFields?: string[];
  extraFields?: string[];
};

export type TemplateConfig = {
  key: string;
  name: string;
  fields: Record<string, string>;
  sliders: SliderConfig[];
  steps: string[];
  activity: string;
  meta?: Record<string, unknown>;
};

export type ModuleExploratoryConfig = {
  module: string;
  templates: TemplateConfig[];
};

export type Scenario = {
  id: string;
  name: string;
  color: string;
};

export const SCENARIO_COLORS = ["#2563EB", "#D97706", "#16A34A"] as const;
