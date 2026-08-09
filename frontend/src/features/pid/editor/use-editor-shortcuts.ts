import { useEffect, useRef } from "react";

export interface EditorShortcutActions {
  readonly undo: () => boolean;
  readonly redo: () => boolean;
  readonly deleteSelection: () => boolean;
  readonly duplicate: () => boolean;
  readonly copy: () => boolean;
  readonly paste: () => boolean;
  readonly rotateClockwise: () => boolean;
  readonly rotateCounterclockwise: () => boolean;
  readonly group: () => boolean;
  readonly alignLeft: () => boolean;
  readonly insertAnnotation: () => boolean;
}

export interface UseEditorShortcutsOptions {
  readonly editable: boolean;
  readonly actions: EditorShortcutActions;
}

export function useEditorShortcuts({ editable, actions }: UseEditorShortcutsOptions): void {
  const current = useRef({ editable, actions });
  current.current = { editable, actions };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || isTextEntry(event.target)) return;
      const { editable: canEdit, actions: callbacks } = current.current;
      const modifier = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      let action: (() => boolean) | undefined;

      if (modifier && key === "c" && !event.shiftKey) action = callbacks.copy;
      else if (!canEdit) return;
      else if ((event.key === "Delete" || event.key === "Backspace") && !modifier) action = callbacks.deleteSelection;
      else if (modifier && key === "d" && !event.shiftKey) action = callbacks.duplicate;
      else if (modifier && key === "v" && !event.shiftKey) action = callbacks.paste;
      else if (modifier && key === "z" && event.shiftKey) action = callbacks.redo;
      else if (modifier && key === "z" && !event.shiftKey) action = callbacks.undo;
      else if (modifier && key === "y" && !event.shiftKey) action = callbacks.redo;
      else if (modifier && event.key === "]") action = callbacks.rotateClockwise;
      else if (modifier && event.key === "[") action = callbacks.rotateCounterclockwise;
      else if (modifier && key === "g" && !event.shiftKey) action = callbacks.group;
      else if (modifier && event.shiftKey && key === "l") action = callbacks.alignLeft;
      else if (modifier && event.shiftKey && key === "a") action = callbacks.insertAnnotation;

      if (action?.()) event.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])"));
}
