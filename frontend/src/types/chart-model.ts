export type AxisDomainModel = {
  min: number;
  max: number;
};

export type ChartPointModel = {
  x: number;
  y: number;
};

export type AxisModel = {
  scale: "linear" | "log";
  label: string;
  units?: string | null;
  domain: AxisDomainModel;
  ticks: number[];
  major_ticks?: number[];
  tick_format?: string | null;
};

export type SeriesModel = {
  id: string;
  name: string;
  kind: "line" | "scatter" | "area" | "band" | "bar";
  points: ChartPointModel[];
  color?: string | null;
};

export type MarkerModel = {
  id: string;
  x: number;
  y: number;
  label: string;
  color?: string | null;
};

export type AnnotationModel = {
  id: string;
  text: string;
  x?: number | null;
  y?: number | null;
  tone?: string | null;
};

export type ChartMetadataModel = {
  version: string;
  units?: Record<string, string>;
};

export type ChartModel = {
  id: string;
  title: string;
  subtitle?: string | null;
  approximation_notice?: string | null;
  axes: Record<string, AxisModel>;
  series: SeriesModel[];
  markers?: MarkerModel[];
  annotations?: AnnotationModel[];
  metadata?: ChartMetadataModel;
};
