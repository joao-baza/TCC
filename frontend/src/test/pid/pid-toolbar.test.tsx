import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EditorToolbar, type EditorToolbarActions } from "@/features/pid/editor/editor-toolbar";
import type { EditorSelectionCapabilities } from "@/features/pid/editor/editor-toolbar-utils";

const noop = () => {};
const fullCaps: EditorSelectionCapabilities = Object.freeze({
  canDelete: true, canCopy: true, canDuplicate: true,
  canRotate: true, canGroup: true, canAlign: true,
});
const actions: EditorToolbarActions = {
  undo: noop, redo: noop, deleteSelection: noop, duplicate: noop,
  copy: noop, paste: noop, rotate: noop, align: noop,
  group: noop, insertAnnotation: noop, fit: noop, zoomIn: noop,
  zoomOut: noop, setConnectionClass: noop,
};

function renderToolbar(overrides: Partial<Parameters<typeof EditorToolbar>[0]> = {}) {
  return render(
    <TooltipProvider>
      <EditorToolbar
        editable={true}
        capabilities={fullCaps}
        canUndo={true}
        canRedo={true}
        canPaste={true}
        canExport={true}
        exporting={false}
        exportErrors={[]}
        exportBackground="white"
        onExportBackgroundChange={noop}
        onExportSvg={noop}
        onExportPng={noop}
        connectionClass="process"
        actions={actions}
        {...overrides}
      />
    </TooltipProvider>,
  );
}

describe("EditorToolbar", () => {
  it("renders undo and redo buttons", () => {
    renderToolbar();
    expect(screen.getByLabelText("Desfazer")).toBeInTheDocument();
    expect(screen.getByLabelText("Refazer")).toBeInTheDocument();
  });

  it("renders line type dropdown", () => {
    renderToolbar();
    expect(screen.getByLabelText("Tipo de linha de conexão")).toBeInTheDocument();
  });

  it("hides editing buttons when not editable", () => {
    renderToolbar({ editable: false });
    expect(screen.queryByLabelText("Desfazer")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Copiar")).not.toBeInTheDocument();
  });

  it("renders export buttons", () => {
    renderToolbar();
    expect(screen.getByLabelText("Exportar SVG")).toBeInTheDocument();
    expect(screen.getByLabelText("Exportar PNG")).toBeInTheDocument();
  });

  it("shows export errors when present", () => {
    renderToolbar({ exportErrors: ["Erro de validação"] });
    expect(screen.getByText("Erro de validação")).toBeInTheDocument();
  });
});
