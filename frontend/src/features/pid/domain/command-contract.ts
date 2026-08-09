import type {
  ConnectionClass,
  PidStandard,
  Point,
  PortDirection,
} from "./model";

export type ReadonlyPidJsonValue =
  | string
  | number
  | boolean
  | null
  | readonly ReadonlyPidJsonValue[]
  | { readonly [key: string]: ReadonlyPidJsonValue };

export type ReadonlyPidProperties = Readonly<Record<string, ReadonlyPidJsonValue>>;

export interface CatalogPortTemplate {
  readonly key: string;
  readonly direction: PortDirection;
  readonly connectionClass: ConnectionClass;
  readonly capacity: number;
}

export interface CatalogSymbol {
  key: string;
  standards: readonly PidStandard[];
  catalogVersion: string;
  name: string;
  defaultSize: Readonly<{ width: number; height: number }>;
  portTemplates: readonly CatalogPortTemplate[];
  tag?: string;
  label?: string;
  properties?: ReadonlyPidProperties;
}

export type PidCommand =
  | { type: "symbol.insert"; symbol: CatalogSymbol; position: Point }
  | { type: "annotation.insert"; text: string; position: Point }
  | { type: "selection.move"; ids: string[]; delta: Point }
  | { type: "selection.align"; ids: string[]; axis: "left" | "center-x" | "right" | "top" | "center-y" | "bottom" }
  | { type: "ports.connect"; sourcePortId: string; targetPortId: string }
  | { type: "selection.rotate"; ids: string[]; degrees: 90 | -90 }
  | { type: "selection.group"; ids: string[] }
  | { type: "selection.duplicate"; ids: string[]; offset: Point }
  | { type: "selection.delete"; ids: string[] }
  | { type: "element.patch"; id: string; patch: Record<string, unknown> }
  | { type: "document.rename"; title: string };

export interface CommandContext {
  generateId?: () => string;
  now?: () => Date;
}

export type InvariantSeverity = "error" | "warning";

export interface DocumentInvariantIssue {
  readonly code: string;
  readonly severity: InvariantSeverity;
  readonly path: readonly (string | number)[];
  readonly message: string;
}

export class DomainCommandError extends Error {
  readonly issues: readonly DocumentInvariantIssue[];

  constructor(
    message: string,
    issues: readonly DocumentInvariantIssue[] = [],
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "DomainCommandError";
    this.issues = freezeIssues(issues);
  }
}

export function invariantIssue(
  code: string,
  severity: InvariantSeverity,
  path: readonly (string | number)[],
  message: string,
): DocumentInvariantIssue {
  return Object.freeze({
    code,
    severity,
    path: Object.freeze([...path]),
    message,
  });
}

export function commandError(
  code: string,
  message: string,
  path: readonly (string | number)[] = [],
  cause?: unknown,
): DomainCommandError {
  return new DomainCommandError(
    message,
    [invariantIssue(code, "error", path, message)],
    cause === undefined ? undefined : { cause },
  );
}

export function freezeIssues(
  issues: readonly DocumentInvariantIssue[],
): readonly DocumentInvariantIssue[] {
  return Object.freeze(issues.map((issue) => invariantIssue(
    issue.code,
    issue.severity,
    issue.path,
    issue.message,
  )));
}
