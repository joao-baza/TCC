import { useSyncExternalStore } from "react";

import type { AccessScope } from "../api/contracts";

export const MINIMUM_EDIT_VIEWPORT_WIDTH = 768;

export function canEdit(scope: AccessScope, viewportWidth: number): boolean {
  return scope === "edit" && viewportWidth >= MINIMUM_EDIT_VIEWPORT_WIDTH;
}

export interface EditCapability {
  readonly editable: boolean;
  readonly viewportWidth: number;
}

export function useEditCapability(scope: AccessScope): EditCapability {
  const viewportWidth = useSyncExternalStore(subscribeViewport, readViewportWidth, readServerViewportWidth);
  return { editable: canEdit(scope, viewportWidth), viewportWidth };
}

function subscribeViewport(notify: () => void): () => void {
  window.addEventListener("resize", notify);
  return () => window.removeEventListener("resize", notify);
}

function readViewportWidth(): number {
  return window.innerWidth;
}

function readServerViewportWidth(): number {
  return 0;
}
