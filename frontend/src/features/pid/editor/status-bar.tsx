import type { EditorState } from "./editor-store";

export function StatusBar({ state, validationCounts }: {
  readonly state: EditorState;
  readonly validationCounts: { errors: number; warnings: number };
}) {
  const { document, viewport } = state;
  const elements = Object.keys(document.nodes).length + Object.keys(document.edges).length
    + Object.keys(document.annotations).length + Object.keys(document.groups).length;
  return <footer aria-label="Status do documento" role="status" className="pid-status-bar">
    <span>Posição {Math.round(viewport.x)}, {Math.round(viewport.y)}</span>
    <span>Zoom {Math.round(viewport.zoom * 100)}%</span>
    <span>{elements} elementos</span>
    <span>{Object.keys(document.nodes).length} equipamentos · {Object.keys(document.edges).length} linhas</span>
    <span>Avisos {validationCounts.warnings} · Erros {validationCounts.errors}</span>
  </footer>;
}
