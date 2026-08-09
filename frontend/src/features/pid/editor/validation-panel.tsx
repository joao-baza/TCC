import type { ValidationIssue } from "../domain/validation";

export interface ValidationPanelProps {
  readonly issues: readonly ValidationIssue[];
  readonly onFocusElement: (elementId: string) => void;
}

export function ValidationPanel({ issues, onFocusElement }: ValidationPanelProps) {
  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");
  return <section className="pid-validation-panel" aria-label="Validações do documento">
    <h2>Validações</h2>
    {issues.length === 0 && <p>Nenhum problema encontrado.</p>}
    {errors.length > 0 && <IssueGroup title={`Erros (${errors.length})`} issues={errors} onFocusElement={onFocusElement} />}
    {warnings.length > 0 && <>
      <IssueGroup title={`Avisos (${warnings.length})`} issues={warnings} onFocusElement={onFocusElement} />
      <p className="pid-validation-note">Avisos não bloqueiam a edição nem a exportação.</p>
    </>}
  </section>;
}

function IssueGroup({ title, issues, onFocusElement }: {
  title: string;
  issues: readonly ValidationIssue[];
  onFocusElement: (elementId: string) => void;
}) {
  return <div className="pid-validation-group">
    <h3>{title}</h3>
    <ul>{issues.map((issue, index) => <li key={`${issue.code}:${issue.elementId ?? "document"}:${issue.field ?? ""}:${index}`}>
      {issue.elementId
        ? <button type="button" onClick={() => onFocusElement(issue.elementId!)} aria-label={`Focar: ${issue.message}`}>{issue.message}</button>
        : <span>{issue.message}</span>}
    </li>)}</ul>
  </div>;
}
