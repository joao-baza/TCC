import type { CatalogSymbol } from "./command-contract";
import { isCatalogSymbolCompatible } from "./catalog-compatibility";
import { assertDocumentInvariants } from "./invariants";
import type { PidDocument, PidJsonValue } from "./model";

export interface ValidationIssue {
  readonly code: string;
  readonly severity: "error" | "warning";
  readonly elementId?: string;
  readonly field?: string;
  readonly message: string;
}

export interface ValidateDocumentOptions {
  /** Snapshot do catálogo usado pelo documento; habilita regras dependentes do símbolo. */
  readonly catalog: readonly CatalogSymbol[];
}

const elementMaps = new Set(["nodes", "ports", "edges", "annotations", "groups"]);

/**
 * Produz diagnósticos seguros e determinísticos sem alterar o documento.
 * Erros estruturais bloqueiam persistência; avisos permanecem informativos.
 */
export function validateDocument(
  value: unknown,
  options: ValidateDocumentOptions,
): readonly ValidationIssue[] {
  try {
    const coreIssues = assertDocumentInvariants(value).map((issue) => fromInvariantIssue(issue));
    if (!options || !Array.isArray(options.catalog)) {
      return freezeSortedIssues([...coreIssues, {
        code: "catalog.context-required",
        severity: "error",
        message: "O catálogo validado é obrigatório para validar o documento.",
      }]);
    }
    const schemaInvalid = coreIssues.some(({ code }) => code.startsWith("schema."));
    const catalogIssues = !schemaInvalid && isDocument(value)
      ? validateCatalogRules(value, options.catalog)
      : [];
    return freezeSortedIssues([...coreIssues, ...catalogIssues]);
  } catch {
    return freezeSortedIssues([{
      code: "schema.unreadable-document",
      severity: "error",
      message: "Não foi possível ler o documento para validação.",
    }]);
  }
}

function validateCatalogRules(
  document: PidDocument,
  catalog: readonly CatalogSymbol[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const symbols = new Map(catalog.map((symbol) => [symbol.key, symbol]));
  const connectedPortIds = new Set<string>();
  for (const edge of Object.values(document.edges)) {
    connectedPortIds.add(edge.sourcePortId);
    connectedPortIds.add(edge.targetPortId);
  }

  for (const node of Object.values(document.nodes)) {
    const symbol = symbols.get(node.symbolKey);
    if (!symbol) {
      issues.push({
        code: "catalog.symbol-missing",
        severity: "error",
        elementId: node.id,
        field: "symbolKey",
        message: `O símbolo ${node.symbolKey} não existe no catálogo validado.`,
      });
      continue;
    }
    if (!isCatalogSymbolCompatible(document.metadata.standard, symbol.standards)) {
      issues.push({
        code: "standard.mixed",
        severity: "error",
        elementId: node.id,
        field: "symbolKey",
        message: `O símbolo ${symbol.name} não é compatível com o standard ${document.metadata.standard.toUpperCase()}.`,
      });
    }

    const portsByTemplate = new Map(
      Object.values(document.ports)
        .filter((port) => port.nodeId === node.id)
        .map((port) => [port.templateKey, port]),
    );
    for (const template of symbol.portTemplates) {
      const port = portsByTemplate.get(template.key);
      if (!port || !connectedPortIds.has(port.id)) {
        issues.push({
          code: "port.required-disconnected",
          severity: "warning",
          elementId: port?.id ?? node.id,
          field: port ? "connection" : `ports.${template.key}`,
          message: `A porta obrigatória ${template.key} está desconectada.`,
        });
      }
    }

    for (const property of Object.keys(symbol.properties ?? {})) {
      if (!isMissingProperty(node.properties[property])) continue;
      issues.push({
        code: "property.required-missing",
        severity: "warning",
        elementId: node.id,
        field: `properties.${property}`,
        message: `A propriedade obrigatória ${property} não foi informada.`,
      });
    }
  }
  return issues;
}

function isMissingProperty(value: PidJsonValue | undefined): boolean {
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}

function fromInvariantIssue(issue: ReturnType<typeof assertDocumentInvariants>[number]): ValidationIssue {
  const [mapName, possibleId, ...rest] = issue.path;
  const hasElement = typeof mapName === "string"
    && elementMaps.has(mapName)
    && typeof possibleId === "string";
  const fieldPath = hasElement ? rest : issue.path;
  return {
    code: issue.code,
    severity: issue.severity,
    ...(hasElement ? { elementId: possibleId } : {}),
    ...(fieldPath.length > 0 ? { field: fieldPath.join(".") } : {}),
    message: issue.message,
  };
}

function freezeSortedIssues(issues: readonly ValidationIssue[]): readonly ValidationIssue[] {
  return Object.freeze(issues
    .map((issue) => Object.freeze({ ...issue }))
    .sort((left, right) => issueKey(left).localeCompare(issueKey(right))));
}

function issueKey(issue: ValidationIssue): string {
  return [issue.severity, issue.code, issue.elementId ?? "", issue.field ?? "", issue.message].join("\u0000");
}

function isDocument(value: unknown): value is PidDocument {
  return typeof value === "object" && value !== null;
}
