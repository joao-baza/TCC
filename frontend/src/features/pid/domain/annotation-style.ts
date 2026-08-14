import type { PidProperties } from "./model";

export const ANNOTATION_FILL_COLOR_PROPERTY = "annotationFillColor";
export const ANNOTATION_TEXT_COLOR_PROPERTY = "annotationTextColor";
export const ANNOTATION_TEXT_ALIGN_PROPERTY = "annotationTextAlign";
export const ANNOTATION_TEXT_VERTICAL_ALIGN_PROPERTY = "annotationTextVerticalAlign";
export const DEFAULT_ANNOTATION_FILL_COLOR = "#fffbeb";
export const DEFAULT_ANNOTATION_TEXT_COLOR = "#1e293b";
export const DEFAULT_ANNOTATION_TEXT_ALIGN: AnnotationTextAlign = "left";
export const DEFAULT_ANNOTATION_TEXT_VERTICAL_ALIGN: AnnotationTextVerticalAlign = "top";
export const ANNOTATION_TEXT_ALIGNMENTS = ["left", "center", "right", "justify"] as const;
export const ANNOTATION_TEXT_VERTICAL_ALIGNMENTS = ["top", "middle", "bottom"] as const;

export type AnnotationTextAlign = typeof ANNOTATION_TEXT_ALIGNMENTS[number];
export type AnnotationTextVerticalAlign = typeof ANNOTATION_TEXT_VERTICAL_ALIGNMENTS[number];

export interface AnnotationColors {
  readonly fillColor: string;
  readonly textColor: string;
}

export type AnnotationColorField =
  | typeof ANNOTATION_FILL_COLOR_PROPERTY
  | typeof ANNOTATION_TEXT_COLOR_PROPERTY;

export function annotationColorsFromProperties(properties: PidProperties): AnnotationColors {
  return {
    fillColor: readHexColor(properties[ANNOTATION_FILL_COLOR_PROPERTY], DEFAULT_ANNOTATION_FILL_COLOR),
    textColor: readHexColor(properties[ANNOTATION_TEXT_COLOR_PROPERTY], DEFAULT_ANNOTATION_TEXT_COLOR),
  };
}

export function annotationTextAlignFromProperties(properties: PidProperties): AnnotationTextAlign {
  const value = properties[ANNOTATION_TEXT_ALIGN_PROPERTY];
  return typeof value === "string" && isAnnotationTextAlign(value) ? value : DEFAULT_ANNOTATION_TEXT_ALIGN;
}

export function annotationTextVerticalAlignFromProperties(properties: PidProperties): AnnotationTextVerticalAlign {
  const value = properties[ANNOTATION_TEXT_VERTICAL_ALIGN_PROPERTY];
  return typeof value === "string" && isAnnotationTextVerticalAlign(value) ? value : DEFAULT_ANNOTATION_TEXT_VERTICAL_ALIGN;
}

export function isAnnotationColorField(field: string): field is AnnotationColorField {
  return field === ANNOTATION_FILL_COLOR_PROPERTY || field === ANNOTATION_TEXT_COLOR_PROPERTY;
}

export function annotationPropertiesWithColor(
  properties: PidProperties,
  field: AnnotationColorField,
  value: string,
): PidProperties {
  return { ...properties, [field]: normalizeHexColor(value) };
}

export function isAnnotationTextAlignField(field: string): field is typeof ANNOTATION_TEXT_ALIGN_PROPERTY {
  return field === ANNOTATION_TEXT_ALIGN_PROPERTY;
}

export function isAnnotationTextVerticalAlignField(field: string): field is typeof ANNOTATION_TEXT_VERTICAL_ALIGN_PROPERTY {
  return field === ANNOTATION_TEXT_VERTICAL_ALIGN_PROPERTY;
}

export function annotationPropertiesWithTextAlign(
  properties: PidProperties,
  value: string,
): PidProperties {
  return { ...properties, [ANNOTATION_TEXT_ALIGN_PROPERTY]: normalizeAnnotationTextAlign(value) };
}

export function annotationPropertiesWithTextVerticalAlign(
  properties: PidProperties,
  value: string,
): PidProperties {
  return { ...properties, [ANNOTATION_TEXT_VERTICAL_ALIGN_PROPERTY]: normalizeAnnotationTextVerticalAlign(value) };
}

export function normalizeHexColor(value: string): string {
  return isHexColor(value) ? value.toLowerCase() : DEFAULT_ANNOTATION_FILL_COLOR;
}

export function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

export function normalizeAnnotationTextAlign(value: string): AnnotationTextAlign {
  return isAnnotationTextAlign(value) ? value : DEFAULT_ANNOTATION_TEXT_ALIGN;
}

export function normalizeAnnotationTextVerticalAlign(value: string): AnnotationTextVerticalAlign {
  return isAnnotationTextVerticalAlign(value) ? value : DEFAULT_ANNOTATION_TEXT_VERTICAL_ALIGN;
}

export function isAnnotationTextAlign(value: string): value is AnnotationTextAlign {
  return (ANNOTATION_TEXT_ALIGNMENTS as readonly string[]).includes(value);
}

export function isAnnotationTextVerticalAlign(value: string): value is AnnotationTextVerticalAlign {
  return (ANNOTATION_TEXT_VERTICAL_ALIGNMENTS as readonly string[]).includes(value);
}

function readHexColor(value: unknown, fallback: string): string {
  return typeof value === "string" && isHexColor(value) ? value.toLowerCase() : fallback;
}
