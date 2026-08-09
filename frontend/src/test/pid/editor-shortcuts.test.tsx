import { fireEvent, render } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { useEditorShortcuts, type EditorShortcutActions } from "@/features/pid/editor/use-editor-shortcuts";

function Harness({ editable = true, actions }: { editable?: boolean; actions: EditorShortcutActions }) {
  const stableActions = useRef(actions);
  stableActions.current = actions;
  useEditorShortcuts({ editable, actions: stableActions.current });
  return <><input aria-label="Campo" /><div contentEditable data-testid="editable" /><button>Canvas</button></>;
}

function actions(): EditorShortcutActions {
  return {
    undo: vi.fn(() => true), redo: vi.fn(() => true), deleteSelection: vi.fn(() => true),
    duplicate: vi.fn(() => true), copy: vi.fn(() => true), paste: vi.fn(() => true),
    rotateClockwise: vi.fn(() => true), rotateCounterclockwise: vi.fn(() => true),
    group: vi.fn(() => true), alignLeft: vi.fn(() => true), insertAnnotation: vi.fn(() => true),
  };
}

describe("atalhos do editor P&ID", () => {
  it.each([{ ctrlKey: true }, { metaKey: true }])("aceita modificador Windows e macOS", (modifier) => {
    const callbacks = actions();
    render(<Harness actions={callbacks} />);
    const event = new KeyboardEvent("keydown", { key: "d", bubbles: true, cancelable: true, ...modifier });
    window.dispatchEvent(event);
    expect(callbacks.duplicate).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it("mapeia undo/redo, clipboard, exclusão e operações avançadas sem duplicar comandos", () => {
    const callbacks = actions();
    render(<Harness actions={callbacks} />);
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    fireEvent.keyDown(window, { key: "z", ctrlKey: true, shiftKey: true });
    fireEvent.keyDown(window, { key: "c", ctrlKey: true });
    fireEvent.keyDown(window, { key: "v", ctrlKey: true });
    fireEvent.keyDown(window, { key: "Delete" });
    fireEvent.keyDown(window, { key: "]", ctrlKey: true });
    fireEvent.keyDown(window, { key: "[", ctrlKey: true });
    fireEvent.keyDown(window, { key: "g", ctrlKey: true });
    fireEvent.keyDown(window, { key: "l", ctrlKey: true, shiftKey: true });
    fireEvent.keyDown(window, { key: "a", ctrlKey: true, shiftKey: true });
    expect(callbacks.undo).toHaveBeenCalledOnce();
    expect(callbacks.redo).toHaveBeenCalledOnce();
    expect(callbacks.copy).toHaveBeenCalledOnce();
    expect(callbacks.paste).toHaveBeenCalledOnce();
    expect(callbacks.deleteSelection).toHaveBeenCalledOnce();
    expect(callbacks.rotateClockwise).toHaveBeenCalledOnce();
    expect(callbacks.rotateCounterclockwise).toHaveBeenCalledOnce();
    expect(callbacks.group).toHaveBeenCalledOnce();
    expect(callbacks.alignLeft).toHaveBeenCalledOnce();
    expect(callbacks.insertAnnotation).toHaveBeenCalledOnce();
  });

  it("ignora entradas, contenteditable, eventos já tratados e repetição", () => {
    const callbacks = actions();
    const { getByLabelText, getByTestId } = render(<Harness actions={callbacks} />);
    fireEvent.keyDown(getByLabelText("Campo"), { key: "Delete" });
    fireEvent.keyDown(getByTestId("editable"), { key: "d", ctrlKey: true });
    const handled = new KeyboardEvent("keydown", { key: "d", ctrlKey: true, bubbles: true, cancelable: true });
    handled.preventDefault();
    window.dispatchEvent(handled);
    fireEvent.keyDown(window, { key: "Delete", repeat: true });
    expect(callbacks.deleteSelection).not.toHaveBeenCalled();
    expect(callbacks.duplicate).not.toHaveBeenCalled();
  });

  it("mantém copy disponível em leitura, mas bloqueia mutações", () => {
    const callbacks = actions();
    render(<Harness editable={false} actions={callbacks} />);
    fireEvent.keyDown(window, { key: "c", metaKey: true });
    fireEvent.keyDown(window, { key: "v", metaKey: true });
    fireEvent.keyDown(window, { key: "Delete" });
    expect(callbacks.copy).toHaveBeenCalledOnce();
    expect(callbacks.paste).not.toHaveBeenCalled();
    expect(callbacks.deleteSelection).not.toHaveBeenCalled();
  });
});
