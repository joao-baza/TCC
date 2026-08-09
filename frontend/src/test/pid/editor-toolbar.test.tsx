import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { EditorToolbar, type EditorSelectionCapabilities } from "@/features/pid/editor/editor-toolbar";

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
  render(<EditorToolbar editable capabilities={capabilities} canUndo={false} canRedo={false} canPaste={false} connectionClass="process" actions={actions} />);
  expect(screen.getByRole("button", { name: "Excluir seleção" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Copiar" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Duplicar" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Girar 90°" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Agrupar" })).toBeDisabled();
  expect(screen.getByRole("combobox", { name: "Alinhar seleção" })).toBeDisabled();
});
