import type { z } from "zod";

import {
  DomainCommandError,
  freezeIssues,
  invariantIssue,
  type DocumentInvariantIssue,
} from "./command-contract";
import { boundsForNodes, buildGraphIndex } from "./graph-operations";
import type { PidDocument } from "./model";
import {
  pidAnnotationSchema,
  pidDocumentSchema,
  pidEdgeSchema,
  pidGroupSchema,
  pidMetadataSchema,
  pidNodeSchema,
  pidPortSchema,
} from "./schema";

interface BlockingValidation {
  readonly schemaValid: boolean;
  readonly issues: readonly DocumentInvariantIssue[];
}

const validationCache = new WeakMap<PidDocument, BlockingValidation>();
const trustedDocuments = new WeakSet<PidDocument>();

// Performance model: only detached, deeply frozen canonical outputs enter the
// identity cache. Each following command validates changed Zod entities;
// reference and blocking graph checks stay linear in V + E through a one-pass
// index. Tag diagnostics remain lazy because warnings do not admit commands.

export function assertDocumentInvariants(value: unknown): DocumentInvariantIssue[] {
  if (!isPidDocumentObject(value)) {
    return [...schemaIssues(pidDocumentSchema.safeParse(value))];
  }
  if (!trustedDocuments.has(value)) {
    const parsed = pidDocumentSchema.safeParse(value);
    if (!parsed.success) return [...schemaIssues(parsed)];
    return [...blockingSemanticIssues(parsed.data), ...tagDiagnostics(parsed.data)];
  }
  const validation = getBlockingValidation(value);
  if (!validation.schemaValid) return [...validation.issues];
  return [...validation.issues, ...tagDiagnostics(value)];
}

export function getBlockingValidation(document: PidDocument): BlockingValidation {
  if (!trustedDocuments.has(document)) return validateUntrustedDocument(document);
  const cached = validationCache.get(document);
  if (!cached) throw new Error("Documento confiável sem registro de validação.");
  return cached;
}

export function validateCommandResult(
  previous: PidDocument,
  next: PidDocument,
): BlockingValidation {
  const previousValidation = getBlockingValidation(previous);
  if (!previousValidation.schemaValid) return previousValidation;

  const structuralIssues = incrementalSchemaIssues(previous, next);
  const validation: BlockingValidation = structuralIssues.length > 0
    ? { schemaValid: false, issues: freezeIssues(structuralIssues) }
    : { schemaValid: true, issues: freezeIssues(blockingSemanticIssues(next)) };
  return validation;
}

export function toTrustedCanonicalDocument(document: PidDocument): PidDocument {
  if (trustedDocuments.has(document)) return document;
  const parsed = pidDocumentSchema.safeParse(document);
  if (!parsed.success) {
    throw new DomainCommandError(
      "O documento de entrada viola o schema canônico.",
      schemaIssues(parsed),
    );
  }
  const detached = deepFreeze(parsed.data);
  const validation: BlockingValidation = {
    schemaValid: true,
    issues: freezeIssues(blockingSemanticIssues(detached)),
  };
  trustedDocuments.add(detached);
  validationCache.set(detached, validation);
  return detached;
}

export function registerTrustedCommandResult(
  document: PidDocument,
  validation: BlockingValidation,
): PidDocument {
  const frozen = deepFreeze(document);
  trustedDocuments.add(frozen);
  validationCache.set(frozen, validation);
  return frozen;
}

export function isStrictBlockingImprovement(
  before: readonly DocumentInvariantIssue[],
  after: readonly DocumentInvariantIssue[],
): boolean {
  if (before.length === 0) return after.length === 0;
  if (after.length >= before.length) return false;
  const previousKeys = new Set(before.map(issueKey));
  return after.every((issue) => previousKeys.has(issueKey(issue)));
}

function incrementalSchemaIssues(previous: PidDocument, next: PidDocument): DocumentInvariantIssue[] {
  const issues: DocumentInvariantIssue[] = [];
  appendZodIssues(issues, pidMetadataSchema.safeParse(next.metadata), ["metadata"]);
  validateChangedMap(issues, "nodes", previous.nodes, next.nodes, pidNodeSchema);
  validateChangedMap(issues, "ports", previous.ports, next.ports, pidPortSchema);
  validateChangedMap(issues, "edges", previous.edges, next.edges, pidEdgeSchema);
  validateChangedMap(issues, "annotations", previous.annotations, next.annotations, pidAnnotationSchema);
  validateChangedMap(issues, "groups", previous.groups, next.groups, pidGroupSchema);

  for (const [portId, port] of Object.entries(next.ports)) {
    if (!next.nodes[port.nodeId]) {
      issues.push(invariantIssue(
        "schema.reference.port-node",
        "error",
        ["ports", portId, "nodeId"],
        `A porta referencia o nó inexistente ${port.nodeId}.`,
      ));
    }
  }
  for (const [edgeId, edge] of Object.entries(next.edges)) {
    if (!next.ports[edge.sourcePortId]) {
      issues.push(invariantIssue(
        "schema.reference.edge-source",
        "error",
        ["edges", edgeId, "sourcePortId"],
        `A borda referencia a porta de origem inexistente ${edge.sourcePortId}.`,
      ));
    }
    if (!next.ports[edge.targetPortId]) {
      issues.push(invariantIssue(
        "schema.reference.edge-target",
        "error",
        ["edges", edgeId, "targetPortId"],
        `A borda referencia a porta de destino inexistente ${edge.targetPortId}.`,
      ));
    }
  }
  for (const [annotationId, annotation] of Object.entries(next.annotations)) {
    if (annotation.nodeId && !next.nodes[annotation.nodeId]) {
      issues.push(invariantIssue(
        "schema.reference.annotation-node",
        "error",
        ["annotations", annotationId, "nodeId"],
        `A anotação referencia o nó inexistente ${annotation.nodeId}.`,
      ));
    }
    if (annotation.edgeId && !next.edges[annotation.edgeId]) {
      issues.push(invariantIssue(
        "schema.reference.annotation-edge",
        "error",
        ["annotations", annotationId, "edgeId"],
        `A anotação referencia a borda inexistente ${annotation.edgeId}.`,
      ));
    }
  }
  for (const [groupId, group] of Object.entries(next.groups)) {
    for (const [index, memberId] of group.memberIds.entries()) {
      if (!next.nodes[memberId]) {
        issues.push(invariantIssue(
          "schema.reference.group-node",
          "error",
          ["groups", groupId, "memberIds", index],
          `O grupo referencia o nó inexistente ${memberId}.`,
        ));
      }
    }
  }
  return issues;
}

function validateUntrustedDocument(document: PidDocument): BlockingValidation {
  const parsed = pidDocumentSchema.safeParse(document);
  return parsed.success
    ? { schemaValid: true, issues: freezeIssues(blockingSemanticIssues(parsed.data)) }
    : { schemaValid: false, issues: schemaIssues(parsed) };
}

function validateChangedMap<T extends { id: string }>(
  issues: DocumentInvariantIssue[],
  mapName: string,
  previous: Record<string, T>,
  next: Record<string, T>,
  schema: z.ZodType<T>,
): void {
  if (previous === next) return;
  for (const [id, value] of Object.entries(next)) {
    if (previous[id] === value) continue;
    appendZodIssues(issues, schema.safeParse(value), [mapName, id]);
    if (id !== value.id) {
      issues.push(invariantIssue(
        "schema.map-id",
        "error",
        [mapName, id, "id"],
        `A chave ${id} deve ser igual ao id do elemento.`,
      ));
    }
  }
}

function blockingSemanticIssues(document: PidDocument): DocumentInvariantIssue[] {
  const issues: DocumentInvariantIssue[] = [];
  const index = buildGraphIndex(document);
  validateGlobalIds(document, issues);

  for (const [nodeId, node] of Object.entries(document.nodes)) {
    if (node.catalogVersion !== document.metadata.catalogVersion) {
      issues.push(invariantIssue(
        "catalog.version-mismatch",
        "error",
        ["nodes", nodeId, "catalogVersion"],
        "A versão do símbolo deve coincidir com a versão do catálogo do documento.",
      ));
    }
    const templateKeys = new Set<string>();
    for (const port of index.portsByNode.get(nodeId) ?? []) {
      const key = port.templateKey.trim().toLowerCase();
      if (templateKeys.has(key)) {
        issues.push(invariantIssue(
          "semantic.duplicate-port-template",
          "error",
          ["ports", port.id, "templateKey"],
          `O nó ${nodeId} possui templates de porta duplicados.`,
        ));
      }
      templateKeys.add(key);
    }
  }

  const semanticConnections = new Set<string>();
  for (const [edgeId, edge] of Object.entries(document.edges)) {
    const source = document.ports[edge.sourcePortId];
    const target = document.ports[edge.targetPortId];
    if (!source || !target) continue;
    if (source.id === target.id) {
      issues.push(invariantIssue(
        "connection.same-port",
        "error",
        ["edges", edgeId],
        "Uma porta não pode ser conectada a ela mesma.",
      ));
    }
    if (source.nodeId === target.nodeId) {
      issues.push(invariantIssue(
        "connection.same-node",
        "error",
        ["edges", edgeId],
        "Não é permitido conectar portas do mesmo nó.",
      ));
    }
    if (source.direction === "input" || target.direction === "output") {
      issues.push(invariantIssue(
        "connection.direction",
        "error",
        ["edges", edgeId],
        "A direção das portas é incompatível com a conexão.",
      ));
    }
    if (edge.utilityCategoryId && edge.connectionClass !== "utility") {
      issues.push(invariantIssue(
        "utility.category",
        "warning",
        ["edges", edgeId],
        "Categoria de utilidade definida para aresta que não é de utilidade.",
      ));
    }
    if (edge.utilityCategoryId
        && !document.metadata.utilityCategories.some(c => c.id === edge.utilityCategoryId)) {
      issues.push(invariantIssue(
        "utility.category",
        "warning",
        ["edges", edgeId],
        "Categoria de utilidade referenciada não existe no documento.",
      ));
    }
    const connectionKey = `${source.id}\u0000${target.id}`;
    if (semanticConnections.has(connectionKey)) {
      issues.push(invariantIssue(
        "connection.duplicate",
        "error",
        ["edges", edgeId],
        "A mesma conexão não pode ser criada mais de uma vez.",
      ));
    }
    semanticConnections.add(connectionKey);
  }
  for (const [portId, count] of index.connectionCountByPort) {
    const port = document.ports[portId];
    if (port && count > port.capacity) {
      issues.push(invariantIssue(
        "connection.capacity",
        "error",
        ["ports", portId, "capacity"],
        `A capacidade da porta foi excedida (${count}/${port.capacity}).`,
      ));
    }
  }

  for (const [groupId, group] of Object.entries(document.groups)) {
    if (group.memberIds.length === 0) {
      issues.push(invariantIssue(
        "group.empty",
        "error",
        ["groups", groupId, "memberIds"],
        "Um grupo deve conter pelo menos um nó.",
      ));
      continue;
    }
    const members = new Set<string>();
    for (const [memberIndex, memberId] of group.memberIds.entries()) {
      if (members.has(memberId)) {
        issues.push(invariantIssue(
          "semantic.duplicate-group-member",
          "error",
          ["groups", groupId, "memberIds", memberIndex],
          "Um nó não pode aparecer duas vezes no mesmo grupo.",
        ));
      }
      members.add(memberId);
    }
    const memberNodes = group.memberIds.map((memberId) => document.nodes[memberId]).filter(Boolean);
    if (memberNodes.length === group.memberIds.length) {
      const bounds = boundsForNodes(memberNodes);
      if (group.x !== bounds.x || group.y !== bounds.y
        || group.width !== bounds.width || group.height !== bounds.height) {
        issues.push(invariantIssue(
          "group.bounds",
          "error",
          ["groups", groupId],
          "Os limites persistidos do grupo devem envolver exatamente seus membros.",
        ));
      }
    }
  }
  return issues;
}

function validateGlobalIds(document: PidDocument, issues: DocumentInvariantIssue[]): void {
  const seen = new Map<string, readonly (string | number)[]>();
  seen.set(document.id, ["id"]);
  for (const [mapName, map] of Object.entries({
    nodes: document.nodes,
    ports: document.ports,
    edges: document.edges,
    annotations: document.annotations,
    groups: document.groups,
  })) {
    for (const id of Object.keys(map)) {
      const path = [mapName, id, "id"] as const;
      const previousPath = seen.get(id);
      if (previousPath) {
        issues.push(invariantIssue(
          "semantic.duplicate-id",
          "error",
          path,
          `O ID ${id} também é usado em ${previousPath.join(".")}.`,
        ));
      } else {
        seen.set(id, path);
      }
    }
  }
}

function tagDiagnostics(document: PidDocument): DocumentInvariantIssue[] {
  const issues: DocumentInvariantIssue[] = [];
  const seen = new Map<string, string>();
  for (const [mapName, map] of Object.entries({ nodes: document.nodes, edges: document.edges })) {
    for (const element of Object.values(map)) {
      const tag = element.tag.trim();
      const path = [mapName, element.id, "tag"];
      if (!tag) {
        issues.push(invariantIssue("semantic.missing-tag", "warning", path, "O elemento não possui tag."));
        continue;
      }
      if (!/^[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*$/.test(tag)) {
        issues.push(invariantIssue("semantic.invalid-tag", "warning", path, `A tag ${tag} não segue o formato recomendado.`));
      }
      const normalized = tag.toLowerCase();
      const previous = seen.get(normalized);
      if (previous) {
        issues.push(invariantIssue(
          "semantic.duplicate-tag",
          "warning",
          path,
          `A tag ${tag} também é usada em ${previous}.`,
        ));
      } else {
        seen.set(normalized, `${mapName}.${element.id}`);
      }
    }
  }
  return issues;
}

function schemaIssues(result: ReturnType<typeof pidDocumentSchema.safeParse>): readonly DocumentInvariantIssue[] {
  if (result.success) return [];
  return freezeIssues(result.error.issues.map((issue) => invariantIssue(
    `schema.${issue.code}`,
    "error",
    issue.path.map((part) => typeof part === "number" ? part : String(part)),
    issue.message,
  )));
}

function appendZodIssues<T>(
  issues: DocumentInvariantIssue[],
  result: z.ZodSafeParseResult<T>,
  prefix: readonly (string | number)[],
): void {
  if (result.success) return;
  for (const issue of result.error.issues) {
    issues.push(invariantIssue(
      `schema.${issue.code}`,
      "error",
      [...prefix, ...issue.path.map((part) => typeof part === "number" ? part : String(part))],
      issue.message,
    ));
  }
}

function issueKey(issue: DocumentInvariantIssue): string {
  return `${issue.code}\u0000${JSON.stringify(issue.path)}`;
}

function isPidDocumentObject(value: unknown): value is PidDocument {
  return typeof value === "object" && value !== null;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
