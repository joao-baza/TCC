import {
  commandError,
  DomainCommandError,
  invariantIssue,
  type CatalogSymbol,
  type CommandContext,
  type PidCommand,
} from "./command-contract";
import { createIdAllocator, reduceCommand } from "./command-reducers";
import { recalculateGroupBounds } from "./graph-operations";
import {
  getBlockingValidation,
  isStrictBlockingImprovement,
  registerTrustedCommandResult,
  toTrustedCanonicalDocument,
  validateCommandResult,
} from "./invariants";
import type { PidDocument, Point } from "./model";

export type {
  CatalogPortTemplate,
  CatalogSymbol,
  CommandContext,
  DocumentInvariantIssue,
  InvariantSeverity,
  PidCommand,
} from "./command-contract";
export { DomainCommandError } from "./command-contract";
export { assertDocumentInvariants } from "./invariants";

export const insertSymbol = (symbol: CatalogSymbol, position: Point): PidCommand => ({
  type: "symbol.insert",
  symbol,
  position,
});

export const insertAnnotation = (text: string, position: Point): PidCommand => ({
  type: "annotation.insert",
  text,
  position,
});

export const moveSelection = (ids: string[], delta: Point): PidCommand => ({
  type: "selection.move",
  ids,
  delta,
});

export const alignSelection = (
  ids: string[],
  axis: Extract<PidCommand, { type: "selection.align" }>["axis"],
): PidCommand => ({ type: "selection.align", ids, axis });

export const connectPorts = (sourcePortId: string, targetPortId: string): PidCommand => ({
  type: "ports.connect",
  sourcePortId,
  targetPortId,
});

export const rotateSelection = (ids: string[], degrees: 90 | -90): PidCommand => ({
  type: "selection.rotate",
  ids,
  degrees,
});

export const groupSelection = (ids: string[]): PidCommand => ({ type: "selection.group", ids });

export const duplicateSelection = (ids: string[], offset: Point): PidCommand => ({
  type: "selection.duplicate",
  ids,
  offset,
});

export const deleteSelection = (ids: string[]): PidCommand => ({ type: "selection.delete", ids });

export const patchElement = (id: string, patch: Record<string, unknown>): PidCommand => ({
  type: "element.patch",
  id,
  patch,
});

export const renameDocument = (title: string): PidCommand => ({ type: "document.rename", title });

/**
 * Applies one immutable command. Canonical command outputs are cached by object
 * identity, so a store command validates only changed entities plus graph
 * invariants. A schema-valid imported document may contain blocking semantic
 * issues; while it does, only strict issue-set improvements are accepted.
 */
export function applyCommand(
  document: PidDocument,
  command: PidCommand,
  context: CommandContext = {},
): PidDocument {
  try {
    const canonicalDocument = toTrustedCanonicalDocument(document);
    const before = getBlockingValidation(canonicalDocument);
    const runtime: Required<CommandContext> = {
      generateId: context.generateId ?? defaultIdGenerator,
      now: context.now ?? defaultClock,
    };
    const allocator = createIdAllocator(canonicalDocument, runtime.generateId);
    let next = reduceCommand(canonicalDocument, command, allocator);
    next = recalculateGroupBounds(next);
    next = {
      ...next,
      metadata: {
        ...next.metadata,
        updatedAt: readTimestamp(runtime.now),
      },
    };

    const after = validateCommandResult(canonicalDocument, next);
    if (!after.schemaValid) {
      throw new DomainCommandError("O comando produziria uma estrutura inválida.", after.issues);
    }
    if (!isStrictBlockingImprovement(before.issues, after.issues)) {
      const repairIssue = invariantIssue(
        "command.repair-required",
        "error",
        [],
        before.issues.length > 0
          ? "O comando deve remover ao menos uma violação bloqueante sem criar ou piorar outras."
          : "O comando não pode introduzir uma violação bloqueante.",
      );
      throw new DomainCommandError(
        "O comando não preserva a melhora monotônica do documento.",
        [repairIssue, ...after.issues],
      );
    }
    return registerTrustedCommandResult(next, after);
  } catch (error) {
    if (error instanceof DomainCommandError) throw error;
    throw commandError(
      "command.unexpected",
      "Não foi possível aplicar o comando.",
      [],
      error,
    );
  }
}

function readTimestamp(now: () => Date): string {
  try {
    return now().toISOString();
  } catch (cause) {
    throw commandError(
      "command.clock.invalid",
      "O relógio do comando não produziu uma data válida.",
      ["metadata", "updatedAt"],
      cause,
    );
  }
}

function defaultIdGenerator(): string {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (typeof randomUUID !== "function") {
    throw commandError(
      "command.id.runtime-unavailable",
      "crypto.randomUUID está indisponível no runtime padrão.",
      ["id"],
    );
  }
  return randomUUID.call(globalThis.crypto);
}

function defaultClock(): Date {
  return new Date();
}
