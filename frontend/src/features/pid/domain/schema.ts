import { z } from "zod";

import type {
  PidAnnotation,
  PidDocument,
  PidEdge,
  PidGroup,
  PidJsonValue,
  PidNode,
  PidPort,
  PidProperties,
  Point,
} from "./model";

export interface CreateEmptyPidDocumentInput {
  title: string;
  standard: PidDocument["metadata"]["standard"];
  catalogVersion?: string;
}

export interface PidDocumentFactoryContext {
  generateId?: () => string;
  now?: () => Date;
}

export class PidDocumentFactoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PidDocumentFactoryError";
  }
}

const uuidSchema = z.string().uuid();
const finiteNumberSchema = z.number().finite();
const positiveNumberSchema = finiteNumberSchema.positive();
const positiveIntegerSchema = finiteNumberSchema.int().positive();
const nonBlankStringSchema = z.string().refine((value) => value.trim().length > 0, {
  message: "Obrigatório informar um texto não vazio.",
});
const rotationSchema = finiteNumberSchema.refine((value) => value % 90 === 0, {
  message: "A rotação deve ser múltipla de 90 graus.",
});
const unsafePropertyKeys = new Set(["__proto__", "prototype", "constructor"]);
const maxPropertyDepth = 64;
const maxPropertyValues = 100_000;
const maxPropertyArrayLength = 10_000;
const maxPropertyObjectKeys = 10_000;

interface JsonTraversalState {
  activePath: WeakSet<object>;
  exhausted: boolean;
  valuesVisited: number;
}

const propertiesSchema: z.ZodType<PidProperties> = z.unknown().transform((value, context) => {
  return cloneJsonProperties(value, context, []);
});

const pointSchema: z.ZodType<Point> = z.object({
  x: finiteNumberSchema,
  y: finiteNumberSchema,
}).strict();

const nodeSchema: z.ZodType<PidNode> = z.object({
  id: uuidSchema,
  symbolKey: nonBlankStringSchema,
  catalogVersion: nonBlankStringSchema,
  x: finiteNumberSchema,
  y: finiteNumberSchema,
  width: positiveNumberSchema,
  height: positiveNumberSchema,
  rotation: rotationSchema,
  tag: z.string(),
  label: z.string(),
  properties: propertiesSchema,
}).strict();

const portSchema: z.ZodType<PidPort> = z.object({
  id: uuidSchema,
  nodeId: uuidSchema,
  templateKey: nonBlankStringSchema,
  direction: z.enum(["input", "output", "bidirectional"]),
  connectionClass: z.enum(["process", "utility", "signal"]),
  capacity: positiveIntegerSchema,
}).strict();

const edgeSchema: z.ZodType<PidEdge> = z.object({
  id: uuidSchema,
  sourcePortId: uuidSchema,
  targetPortId: uuidSchema,
  connectionClass: z.enum(["process", "utility", "signal"]),
  route: z.array(pointSchema),
  tag: z.string(),
  label: z.string(),
  properties: propertiesSchema,
}).strict();

const annotationSchema: z.ZodType<PidAnnotation> = z.object({
  id: uuidSchema,
  kind: z.enum(["text", "note", "callout"]),
  text: z.string(),
  x: finiteNumberSchema,
  y: finiteNumberSchema,
  width: positiveNumberSchema,
  height: positiveNumberSchema,
  rotation: rotationSchema,
  nodeId: uuidSchema.optional(),
  edgeId: uuidSchema.optional(),
  properties: propertiesSchema,
}).strict();

const groupSchema: z.ZodType<PidGroup> = z.object({
  id: uuidSchema,
  label: z.string(),
  memberIds: z.array(uuidSchema),
  x: finiteNumberSchema,
  y: finiteNumberSchema,
  width: positiveNumberSchema,
  height: positiveNumberSchema,
  properties: propertiesSchema,
}).strict();

const recordSchema = <T>(itemSchema: z.ZodType<T>) => z.record(z.string(), itemSchema);

export const pidDocumentSchema: z.ZodType<PidDocument> = z.object({
  schemaVersion: z.literal(1),
  id: uuidSchema,
  metadata: z.object({
    title: nonBlankStringSchema,
    standard: z.enum(["isa", "iso", "free"]),
    catalogVersion: nonBlankStringSchema,
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  }).strict(),
  nodes: recordSchema(nodeSchema),
  ports: recordSchema(portSchema),
  edges: recordSchema(edgeSchema),
  annotations: recordSchema(annotationSchema),
  groups: recordSchema(groupSchema),
}).strict().superRefine((document, context) => {
  validateMapIds(context, "nodes", document.nodes);
  validateMapIds(context, "ports", document.ports);
  validateMapIds(context, "edges", document.edges);
  validateMapIds(context, "annotations", document.annotations);
  validateMapIds(context, "groups", document.groups);

  for (const [portId, port] of Object.entries(document.ports)) {
    if (!document.nodes[port.nodeId]) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ports", portId, "nodeId"],
        message: `A porta referencia o nó inexistente ${port.nodeId}.`,
      });
    }
  }

  for (const [edgeId, edge] of Object.entries(document.edges)) {
    if (!document.ports[edge.sourcePortId]) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["edges", edgeId, "sourcePortId"],
        message: `A borda referencia a porta de origem inexistente ${edge.sourcePortId}.`,
      });
    }
    if (!document.ports[edge.targetPortId]) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["edges", edgeId, "targetPortId"],
        message: `A borda referencia a porta de destino inexistente ${edge.targetPortId}.`,
      });
    }
  }

  for (const [annotationId, annotation] of Object.entries(document.annotations)) {
    if (annotation.nodeId && !document.nodes[annotation.nodeId]) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["annotations", annotationId, "nodeId"],
        message: `A anotação referencia o nó inexistente ${annotation.nodeId}.`,
      });
    }
    if (annotation.edgeId && !document.edges[annotation.edgeId]) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["annotations", annotationId, "edgeId"],
        message: `A anotação referencia a borda inexistente ${annotation.edgeId}.`,
      });
    }
  }

  for (const [groupId, group] of Object.entries(document.groups)) {
    for (const [memberIndex, memberId] of group.memberIds.entries()) {
      if (!document.nodes[memberId]) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["groups", groupId, "memberIds", memberIndex],
          message: `O grupo referencia o nó inexistente ${memberId}.`,
        });
      }
    }
  }
});

function validateMapIds(
  context: z.RefinementCtx,
  mapName: string,
  values: Record<string, { id: string }>,
) {
  for (const [key, value] of Object.entries(values)) {
    if (key !== value.id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [mapName, key, "id"],
        message: `A chave ${key} deve ser igual ao id do elemento.`,
      });
    }
  }
}

function cloneJsonProperties(value: unknown, context: z.RefinementCtx, path: PropertyKey[]): PidProperties {
  const state: JsonTraversalState = {
    activePath: new WeakSet(),
    exhausted: false,
    valuesVisited: 0,
  };
  if (!consumeTraversalValue(state, context, path)) return {};
  if (!isPlainRecord(value)) {
    addJsonPropertyIssue(context, path, "As propriedades devem ser objetos JSON simples.");
    return {};
  }
  return cloneJsonRecord(value, context, path, state, 0);
}

function cloneJsonValue(
  value: unknown,
  context: z.RefinementCtx,
  path: PropertyKey[],
  state: JsonTraversalState,
  depth: number,
): PidJsonValue {
  if (!consumeTraversalValue(state, context, path)) return null;
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      addJsonPropertyIssue(context, path, "Os valores das propriedades devem ser números finitos.");
      return null;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return cloneJsonArray(value, context, path, state, depth);
  }
  if (!isPlainRecord(value)) {
    addJsonPropertyIssue(context, path, "As propriedades devem conter apenas valores JSON serializáveis.");
    return null;
  }

  return cloneJsonRecord(value, context, path, state, depth);
}

function cloneJsonRecord(
  value: Record<string, unknown>,
  context: z.RefinementCtx,
  path: PropertyKey[],
  state: JsonTraversalState,
  depth: number,
): PidProperties {
  if (!enterContainer(value, context, path, state, depth)) return {};
  const clone: PidProperties = {};
  try {
    const keys = Reflect.ownKeys(value);
    if (keys.length > maxPropertyObjectKeys) {
      addJsonPropertyIssue(context, path, "Objetos de propriedades não podem exceder 10.000 chaves próprias.");
      return clone;
    }

    for (const key of keys) {
      if (state.exhausted) break;
      const keyPath = appendPropertyPath(path, key);
      if (typeof key !== "string") {
        addJsonPropertyIssue(context, keyPath, "As propriedades não podem ter chaves symbol.");
        continue;
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor) continue;
      if (!descriptor.enumerable) {
        addJsonPropertyIssue(context, keyPath, "As propriedades não podem ter chaves não enumeráveis.");
        continue;
      }
      if ("get" in descriptor || "set" in descriptor) {
        addJsonPropertyIssue(context, keyPath, "As propriedades não podem ter accessors.");
        continue;
      }
      if (unsafePropertyKeys.has(key)) {
        addJsonPropertyIssue(context, keyPath, "Chave de propriedade insegura.");
        continue;
      }
      clone[key] = cloneJsonValue(descriptor.value, context, keyPath, state, depth + 1);
    }
    return clone;
  } finally {
    state.activePath.delete(value);
  }
}

function cloneJsonArray(
  value: unknown[],
  context: z.RefinementCtx,
  path: PropertyKey[],
  state: JsonTraversalState,
  depth: number,
): PidJsonValue[] {
  if (!enterContainer(value, context, path, state, depth)) return [];
  const clone: PidJsonValue[] = [];
  try {
    const keys = Reflect.ownKeys(value);
    if (keys.length - 1 > maxPropertyObjectKeys) {
      addJsonPropertyIssue(context, path, "Arrays de propriedades não podem exceder 10.000 chaves próprias.");
      return clone;
    }
    if (value.length > maxPropertyArrayLength) {
      addJsonPropertyIssue(context, path, "Arrays de propriedades não podem exceder 10.000 itens.");
      return clone;
    }

    let indexedKeyCount = 0;
    for (const key of keys) {
      if (key === "length") continue;
      if (typeof key === "string" && isArrayIndex(key, value.length)) {
        indexedKeyCount += 1;
        continue;
      }
      addJsonPropertyIssue(
        context,
        appendPropertyPath(path, key),
        typeof key === "symbol"
          ? "Arrays de propriedades não podem ter chaves symbol."
          : "Arrays de propriedades não podem ter chaves extras.",
      );
    }
    if (indexedKeyCount !== value.length) {
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.hasOwn(value, index)) {
          addJsonPropertyIssue(context, [...path, index], "Arrays de propriedades não podem ser esparsos.");
          break;
        }
      }
      return clone;
    }

    for (let index = 0; index < value.length; index += 1) {
      if (state.exhausted) break;
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      const itemPath = [...path, index];
      if (!descriptor || !descriptor.enumerable) {
        addJsonPropertyIssue(context, itemPath, "Arrays não podem ter índices não enumeráveis.");
        continue;
      }
      if ("get" in descriptor || "set" in descriptor) {
        addJsonPropertyIssue(context, itemPath, "Arrays não podem ter accessors.");
        continue;
      }
      clone.push(cloneJsonValue(descriptor.value, context, itemPath, state, depth + 1));
    }
    return clone;
  } finally {
    state.activePath.delete(value);
  }
}

function isArrayIndex(key: string, length: number): boolean {
  const index = Number(key);
  return Number.isInteger(index) && index >= 0 && index < length && String(index) === key;
}

function appendPropertyPath(path: PropertyKey[], key: PropertyKey): PropertyKey[] {
  return [...path, typeof key === "symbol" ? `[${String(key)}]` : key];
}

function addJsonPropertyIssue(context: z.RefinementCtx, path: PropertyKey[], message: string): void {
  context.addIssue({
    code: z.ZodIssueCode.custom,
    path,
    message,
  });
}

function consumeTraversalValue(state: JsonTraversalState, context: z.RefinementCtx, path: PropertyKey[]): boolean {
  if (state.exhausted) return false;
  state.valuesVisited += 1;
  if (state.valuesVisited <= maxPropertyValues) return true;

  state.exhausted = true;
  addJsonPropertyIssue(context, path, "Limite de 100.000 valores de propriedades excedido.");
  return false;
}

function enterContainer(
  value: object,
  context: z.RefinementCtx,
  path: PropertyKey[],
  state: JsonTraversalState,
  depth: number,
): boolean {
  if (depth > maxPropertyDepth) {
    addJsonPropertyIssue(context, path, "Profundidade máxima de propriedades (64) excedida.");
    return false;
  }
  if (state.activePath.has(value)) {
    addJsonPropertyIssue(context, path, "Referência cíclica em propriedades não é permitida.");
    return false;
  }
  state.activePath.add(value);
  return true;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object"
    && value !== null
    && Object.getPrototypeOf(value) === Object.prototype;
}

const createEmptyPidDocumentInputSchema: z.ZodType<CreateEmptyPidDocumentInput> = z.object({
  title: z.string(),
  standard: z.enum(["isa", "iso", "free"]),
  catalogVersion: z.string().optional(),
}).strict();

export function createEmptyDocument(
  input: CreateEmptyPidDocumentInput,
  context: PidDocumentFactoryContext = {},
): PidDocument {
  const { title, standard, catalogVersion = "local-v1" } = createEmptyPidDocumentInputSchema.parse(input);
  const normalizedTitle = title.trim();
  const normalizedCatalogVersion = catalogVersion.trim();

  if (!normalizedTitle) {
    throw new Error("O título do diagrama é obrigatório.");
  }
  if (!normalizedCatalogVersion) {
    throw new Error("A versão do catálogo é obrigatória.");
  }

  const timestamp = (context.now ?? defaultClock)().toISOString();
  return parsePidDocument({
    schemaVersion: 1,
    id: (context.generateId ?? defaultIdGenerator)(),
    metadata: {
      title: normalizedTitle,
      standard,
      catalogVersion: normalizedCatalogVersion,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    nodes: {},
    ports: {},
    edges: {},
    annotations: {},
    groups: {},
  });
}

export function parsePidDocument(value: unknown): PidDocument {
  return pidDocumentSchema.parse(value);
}

function defaultIdGenerator(): string {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (typeof randomUUID !== "function") {
    throw new PidDocumentFactoryError("crypto.randomUUID está indisponível no runtime padrão.");
  }
  return randomUUID.call(globalThis.crypto);
}

function defaultClock(): Date {
  return new Date();
}
