import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import type { PidDocument } from "@/features/pid/domain/model";
import { alignSelection, rotateSelection } from "@/features/pid/domain/commands";
import {
  EditorToolbar,
  getEditorPositionedSelectionIds,
  getEditorSelectionCapabilities,
  type EditorSelectionCapabilities,
} from "@/features/pid/editor/editor-toolbar";

const actions = {
  undo: vi.fn(), redo: vi.fn(), deleteSelection: vi.fn(), duplicate: vi.fn(), copy: vi.fn(), paste: vi.fn(),
  rotate: vi.fn(), align: vi.fn(), group: vi.fn(), insertAnnotation: vi.fn(), fit: vi.fn(), zoomIn: vi.fn(),
  zoomOut: vi.fn(), setConnectionClass: vi.fn(),
};

it("mantém somente exclusão habilitada para seleção exclusiva de aresta", () => {
  const capabilities: EditorSelectionCapabilities = {
    canDelete: true,
    canCopy: false,
    canDuplicate: false,
    canRotate: false,
    canGroup: false,
    canAlign: false,
  };
  const onExportSvg = vi.fn();
  render(<EditorToolbar editable capabilities={capabilities} canUndo={false} canRedo={false} canPaste={false} canExport exporting={false} exportErrors={[]} exportBackground="white" onExportBackgroundChange={vi.fn()} onExportSvg={onExportSvg} onExportPng={vi.fn()} connectionClass="process" actions={actions} />);
  expect(screen.getByRole("button", { name: "Excluir seleção" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Copiar" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Duplicar" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Girar 90°" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Agrupar" })).toBeDisabled();
  expect(screen.getByRole("combobox", { name: "Alinhar seleção" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Exportar SVG" }));
  expect(onExportSvg).toHaveBeenCalledTimes(1);
});

it("mantém exportação independente da permissão de edição", () => {
  const onExportSvg = vi.fn();
  const onExportPng = vi.fn();
  const capabilities: EditorSelectionCapabilities = {
    canDelete: false, canCopy: false, canDuplicate: false, canRotate: false, canGroup: false, canAlign: false,
  };
  const { rerender } = render(<EditorToolbar editable={false} capabilities={capabilities} canUndo={false} canRedo={false} canPaste={false} canExport exporting={false} exportErrors={[]} exportBackground="white" onExportBackgroundChange={vi.fn()} onExportSvg={onExportSvg} onExportPng={onExportPng} connectionClass="process" actions={actions} />);
  expect(screen.getByRole("button", { name: "Exportar SVG" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Exportar PNG" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Exportar SVG" }));
  fireEvent.click(screen.getByRole("button", { name: "Exportar PNG" }));
  expect(onExportSvg).toHaveBeenCalledTimes(1);
  expect(onExportPng).toHaveBeenCalledTimes(1);

  rerender(<EditorToolbar editable={false} capabilities={capabilities} canUndo={false} canRedo={false} canPaste={false} canExport={false} exporting exportErrors={["O nó A referencia um símbolo ausente."]} exportBackground="transparent" onExportBackgroundChange={vi.fn()} onExportSvg={onExportSvg} onExportPng={onExportPng} connectionClass="process" actions={actions} />);
  expect(screen.getByRole("button", { name: "Exportar SVG" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Exportar PNG" })).toBeDisabled();
  expect(screen.getByRole("group", { name: "Erros que bloqueiam a exportação" })).toHaveTextContent("O nó A referencia um símbolo ausente.");
  expect(screen.getByRole("status")).toHaveTextContent("Preparando exportação");
  expect(screen.getByRole("combobox", { name: "Fundo da exportação" })).toHaveValue("transparent");
});

it("habilita rotação e alinhamento de grupo e preserva o ID do grupo para o comando", () => {
  const document = groupedDocument();
  const capabilities = getEditorSelectionCapabilities(document, ["group"]);
  const positionedIds = getEditorPositionedSelectionIds(document, ["group"]);
  expect(capabilities).toMatchObject({ canRotate: true, canAlign: true });
  expect(rotateSelection(positionedIds, 90)).toMatchObject({ ids: ["group"] });
  expect(alignSelection(positionedIds, "left")).toMatchObject({ ids: ["group"] });
});

function groupedDocument(): PidDocument {
  const node = (id: string, x: number): PidDocument["nodes"][string] => ({
    id, symbolKey: "symbol", catalogVersion: "local-v1", x, y: 0,
    width: 10, height: 10, rotation: 0, tag: "", label: "", properties: {},
  });
  return {
    schemaVersion: 1,
    id: "document",
    metadata: { title: "Grupo", standard: "free", catalogVersion: "local-v1", createdAt: "", updatedAt: "" },
    nodes: { first: node("first", 0), second: node("second", 20) },
    ports: {}, edges: {}, annotations: {},
    groups: { group: { id: "group", label: "", memberIds: ["first", "second"], x: 0, y: 0, width: 30, height: 10, properties: {} } },
  };
}
