import type { ConnectionClass } from "../domain/model";

export interface EditorToolbarActions {
  undo(): void; redo(): void; deleteSelection(): void; duplicate(): void; copy(): void; paste(): void;
  rotate(degrees: 90 | -90): void; align(axis: "left" | "center-x" | "right" | "top" | "center-y" | "bottom"): void;
  group(): void; insertAnnotation(): void; fit(): void; zoomIn(): void; zoomOut(): void;
  setConnectionClass(value: ConnectionClass): void;
}

export function EditorToolbar({ editable, selectionCount, canUndo, canRedo, canPaste, connectionClass, actions }: {
  readonly editable: boolean;
  readonly selectionCount: number;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly canPaste: boolean;
  readonly connectionClass: ConnectionClass;
  readonly actions: EditorToolbarActions;
}) {
  const selected = selectionCount > 0;
  const alignable = selectionCount > 1;
  return <div role="toolbar" aria-label="Ferramentas do editor P&ID" className="pid-editor-toolbar">
    {editable && <>
      <Tool label="Desfazer" shortcut="Ctrl/Cmd+Z" disabled={!canUndo} onClick={actions.undo} />
      <Tool label="Refazer" shortcut="Ctrl/Cmd+Shift+Z" disabled={!canRedo} onClick={actions.redo} />
      <Tool label="Excluir seleção" shortcut="Delete" disabled={!selected} onClick={actions.deleteSelection} />
      <Tool label="Duplicar" shortcut="Ctrl/Cmd+D" disabled={!selected} onClick={actions.duplicate} />
    </>}
    <Tool label="Copiar" shortcut="Ctrl/Cmd+C" disabled={!selected} onClick={actions.copy} />
    {editable && <>
      <Tool label="Colar" shortcut="Ctrl/Cmd+V" disabled={!canPaste} onClick={actions.paste} />
      <Tool label="Girar 90°" shortcut="Ctrl/Cmd+]" disabled={!selected} onClick={() => actions.rotate(90)} />
      <Tool label="Girar -90°" shortcut="Ctrl/Cmd+[" disabled={!selected} onClick={() => actions.rotate(-90)} />
      <label className="pid-toolbar-select">Alinhar
        <select aria-label="Alinhar seleção" disabled={!alignable} defaultValue="" onChange={(event) => { if (event.target.value) actions.align(event.target.value as Parameters<EditorToolbarActions["align"]>[0]); event.target.value = ""; }}>
          <option value="">Escolher…</option><option value="left">Esquerda</option><option value="center-x">Centro horizontal</option><option value="right">Direita</option><option value="top">Topo</option><option value="center-y">Centro vertical</option><option value="bottom">Base</option>
        </select>
      </label>
      <Tool label="Agrupar" shortcut="Ctrl/Cmd+G" disabled={!selected} onClick={actions.group} />
      <Tool label="Adicionar anotação" shortcut="Ctrl/Cmd+Shift+A" onClick={actions.insertAnnotation} />
      <div role="group" aria-label="Tipo de linha" className="pid-toolbar-group">
        {(["process", "utility", "signal"] as const).map((value) => <button key={value} type="button" aria-pressed={connectionClass === value} onClick={() => actions.setConnectionClass(value)}>Linha {value === "process" ? "de processo" : value === "utility" ? "de utilidade" : "de sinal"}</button>)}
      </div>
    </>}
    <Tool label="Ajustar diagrama à tela" onClick={actions.fit} />
    <Tool label="Aumentar zoom" onClick={actions.zoomIn} />
    <Tool label="Diminuir zoom" onClick={actions.zoomOut} />
  </div>;
}

function Tool({ label, shortcut, disabled, onClick }: { label: string; shortcut?: string; disabled?: boolean; onClick: () => void }) {
  return <button type="button" title={shortcut ? `${label} (${shortcut})` : label} aria-label={label} disabled={disabled} onClick={onClick}>{label}{shortcut && <span className="sr-only">, atalho {shortcut}</span>}</button>;
}
