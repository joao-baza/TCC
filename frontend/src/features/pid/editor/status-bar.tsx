import type { EditorState } from "./editor-store";
import type { EditorSaveState } from "./use-editor-autosave";

export function StatusBar({ state, saveState, onRetry }: {
  readonly state: EditorState;
  readonly saveState: EditorSaveState;
  readonly onRetry?: () => void;
}) {
  const { document, viewport } = state;
  const elements = Object.keys(document.nodes).length + Object.keys(document.edges).length
    + Object.keys(document.annotations).length + Object.keys(document.groups).length;
  return <footer aria-label="Status do documento" role="status" className="pid-status-bar">
    <span>{saveState}</span>
    {saveState === "Não salvo" && onRetry && <button type="button" onClick={onRetry}>Tentar salvar novamente</button>}
    <span>Posição {Math.round(viewport.x)}, {Math.round(viewport.y)}</span>
    <span>Zoom {Math.round(viewport.zoom * 100)}%</span>
    <span>{elements} elementos</span>
    <span>{Object.keys(document.nodes).length} equipamentos · {Object.keys(document.edges).length} linhas</span>
    <span>Avisos 0 · Erros 0</span>
  </footer>;
}
