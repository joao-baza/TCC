import { useEffect, useState } from "react";

import type { ValidationIssue } from "../domain/validation";

export interface ValidationPanelProps {
  readonly issues: readonly ValidationIssue[];
  readonly onFocusElement: (elementId: string) => void;
}

export function ValidationPanel({ issues, onFocusElement }: ValidationPanelProps) {
  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");
  const [expanded, setExpanded] = useState(errors.length > 0);
  useEffect(() => {
    if (errors.length > 0) setExpanded(true);
    else if (issues.length === 0) setExpanded(false);
  }, [errors.length, issues.length]);
  return <section className="pid-validation-panel" aria-label="Validações do documento">
    <details open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)}>
      <summary className="pid-validation-summary">
        <span>Validações</span>
        <span className="pid-validation-count" aria-label={`${errors.length} erros e ${warnings.length} avisos`}>
          {errors.length + warnings.length}
        </span>
      </summary>
      <div className="pid-validation-content">
        {issues.length === 0 && <p>Nenhum problema encontrado.</p>}
        {errors.length > 0 && <IssueGroup title={`Erros (${errors.length})`} issues={errors} onFocusElement={onFocusElement} />}
        {warnings.length > 0 && <>
          <IssueGroup title={`Avisos (${warnings.length})`} issues={warnings} onFocusElement={onFocusElement} />
          <p className="pid-validation-note">Avisos não bloqueiam a edição nem a exportação.</p>
        </>}
      </div>
    </details>
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
