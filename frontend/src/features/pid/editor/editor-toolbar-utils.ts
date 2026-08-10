import type { PidDocument } from "../domain/model";

export interface EditorSelectionCapabilities {
  readonly canDelete: boolean;
  readonly canCopy: boolean;
  readonly canDuplicate: boolean;
  readonly canRotate: boolean;
  readonly canGroup: boolean;
  readonly canAlign: boolean;
}

export function getEditorSelectionCapabilities(
  document: PidDocument,
  selection: readonly string[],
): EditorSelectionCapabilities {
  const ids = [...new Set(selection)];
  const nodeCount = ids.filter((id) => Boolean(document.nodes[id])).length;
  const groupCount = ids.filter((id) => Boolean(document.groups[id])).length;
  const annotationCount = ids.filter((id) => Boolean(document.annotations[id])).length;
  const positionedCount = countResolvedPositionedElements(document, ids);
  const copyable = nodeCount + annotationCount + groupCount > 0;
  return Object.freeze({
    canDelete: ids.some((id) => Boolean(document.nodes[id] || document.edges[id] || document.annotations[id] || document.groups[id] || document.ports[id])),
    canCopy: copyable,
    canDuplicate: copyable,
    canRotate: positionedCount > 0,
    canGroup: nodeCount > 0,
    canAlign: positionedCount > 1,
  });
}

export function getEditorPositionedSelectionIds(
  document: PidDocument,
  selection: readonly string[],
): string[] {
  return [...new Set(selection)].filter((id) => Boolean(
    document.nodes[id] || document.annotations[id] || document.groups[id],
  ));
}

function countResolvedPositionedElements(document: PidDocument, selection: readonly string[]): number {
  const nodeIds = new Set<string>();
  const annotationIds = new Set<string>();
  for (const id of selection) {
    if (document.nodes[id]) nodeIds.add(id);
    else if (document.annotations[id]) annotationIds.add(id);
    else document.groups[id]?.memberIds.forEach((memberId) => {
      if (document.nodes[memberId]) nodeIds.add(memberId);
    });
  }
  return nodeIds.size + annotationIds.size;
}
