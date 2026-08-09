import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import { isPidDocumentError, type OpenedPidDiagram } from "../api/contracts";
import { usePidServices } from "../api/pid-services";
import { PidCanvas, type PidCanvasSelection, type PidCanvasViewportAction } from "../canvas/pid-canvas";
import { createCatalogIndex } from "../catalog/catalog-index";
import { CatalogPanel } from "../catalog/catalog-panel";
import { localCatalog } from "../catalog/fixtures/catalog";
import {
  alignSelection, deleteSelection, groupSelection, insertAnnotation, insertSymbol, rotateSelection,
  type PidCommand,
} from "../domain/commands";
import type { ConnectionClass } from "../domain/model";
import { DocumentActionsMenu } from "./document-actions-menu";
import { copyEditorSelection, pasteEditorFragment, type EditorClipboardFragment } from "./editor-clipboard";
import { EditorToolbar, type EditorToolbarActions } from "./editor-toolbar";
import { createEditorStore, type EditorStore } from "./editor-store";
import { ShareDialog } from "./share-dialog";
import { StatusBar } from "./status-bar";
import { useEditorAutosave } from "./use-editor-autosave";
import { useEditorShortcuts, type EditorShortcutActions } from "./use-editor-shortcuts";

const catalogIndex = createCatalogIndex(localCatalog);

interface EditorSession {
  readonly opened: OpenedPidDiagram;
  readonly routeToken: string;
  readonly store: EditorStore;
}

export function PidEditorPage() {
  const { document: documentPort } = usePidServices();
  const { diagramId = "" } = useParams();
  const { hash } = useLocation();
  const [session, setSession] = useState<EditorSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const token = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash).get("access") ?? "";

  useEffect(() => {
    let active = true;
    setSession(null); setError(null);
    if (!diagramId || !token) {
      setError("O link do diagrama não contém uma credencial de acesso válida.");
      return () => { active = false; };
    }
    void documentPort.open(diagramId, token).then(
      (opened) => {
        if (!active) return;
        setSession({ opened, routeToken: token, store: createEditorStore(opened.document) });
      },
      (reason: unknown) => {
        if (!active) return;
        setError(isPidDocumentError(reason) ? reason.message : "Não foi possível abrir o diagrama.");
      },
    );
    return () => { active = false; };
  }, [diagramId, documentPort, token]);

  if (!session) return <main className="pid-editor-loading"><h1>Editor P&amp;ID</h1>{error
    ? <p role="alert">{error}</p>
    : <p role="status">Carregando diagrama…</p>}<Link to="/">Voltar ao DCOU</Link></main>;
  return <EditorStudio key={`${diagramId}:${session.routeToken}`} diagramId={diagramId} session={session} />;
}

function EditorStudio({ diagramId, session }: { diagramId: string; session: EditorSession }) {
  const { document: documentPort } = usePidServices();
  const { store, opened } = session;
  const subscribe = useCallback((notify: () => void) => store.subscribe(() => notify()), [store]);
  const editor = useSyncExternalStore(subscribe, store.getState, store.getState);
  const editable = opened.scope === "edit";
  const [revision, setRevision] = useState(opened.revision);
  const [editToken, setEditToken] = useState(session.routeToken);
  const [deleted, setDeleted] = useState(false);
  const [catalogCollapsed, setCatalogCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [connectionClass, setConnectionClass] = useState<ConnectionClass>("process");
  const [viewportAction, setViewportAction] = useState<PidCanvasViewportAction>();
  const [announcement, setAnnouncement] = useState("");
  const [operationError, setOperationError] = useState<string | null>(null);
  const clipboardRef = useRef<EditorClipboardFragment | null>(null);
  const pasteCountRef = useRef(0);
  const autosave = useEditorAutosave({ diagramId, editToken, revision, store, documentPort, editable, onRevision: setRevision });
  const selectionCount = editor.selection.length;
  const selectedNodeIds = editor.selection.filter((id) => Boolean(editor.document.nodes[id]));
  const canvasSelection: PidCanvasSelection = useMemo(() => ({
    nodeIds: editor.selection.filter((id) => Boolean(editor.document.nodes[id])),
    edgeIds: editor.selection.filter((id) => Boolean(editor.document.edges[id])),
  }), [editor.document.edges, editor.document.nodes, editor.selection]);

  const mutate = useCallback((operation: () => void): boolean => {
    if (!editable || deleted) return false;
    try { operation(); autosave.markLocalChange(); setOperationError(null); return true; }
    catch (reason) { setOperationError(reason instanceof Error ? reason.message : "A operação não pôde ser concluída."); return false; }
  }, [autosave, deleted, editable]);
  const dispatch = useCallback((command: PidCommand) => mutate(() => store.dispatch(command)), [mutate, store]);
  const copy = useCallback((): boolean => {
    if (editor.selection.length === 0) return false;
    try {
      clipboardRef.current = copyEditorSelection(editor.document, editor.selection);
      pasteCountRef.current = 0;
      setAnnouncement("Seleção copiada para o clipboard interno do editor.");
      return true;
    } catch (reason) { setOperationError(reason instanceof Error ? reason.message : "Não foi possível copiar a seleção."); return false; }
  }, [editor.document, editor.selection]);
  const paste = useCallback((): boolean => {
    const fragment = clipboardRef.current;
    if (!fragment) return false;
    const step = pasteCountRef.current + 1;
    return mutate(() => {
      const result = pasteEditorFragment(store.getState().document, fragment, { offset: { x: step * 24, y: step * 24 } });
      store.replace(result.document, "local");
      store.setSelection(result.selection);
      pasteCountRef.current = step;
      setAnnouncement("Fragmento colado com novos identificadores.");
    });
  }, [mutate, store]);
  const duplicate = useCallback(() => copy() && paste(), [copy, paste]);
  const undo = useCallback(() => editor.past.length > 0 && mutate(store.undo), [editor.past.length, mutate, store.undo]);
  const redo = useCallback(() => editor.future.length > 0 && mutate(store.redo), [editor.future.length, mutate, store.redo]);
  const remove = useCallback(() => editor.selection.length > 0 && dispatch(deleteSelection([...editor.selection])), [dispatch, editor.selection]);
  const rotate = useCallback((degrees: 90 | -90) => editor.selection.length > 0 && dispatch(rotateSelection([...editor.selection], degrees)), [dispatch, editor.selection]);
  const group = useCallback(() => selectedNodeIds.length > 0 && dispatch(groupSelection(selectedNodeIds)), [dispatch, selectedNodeIds]);
  const align = useCallback((axis: Parameters<EditorToolbarActions["align"]>[0]) => selectedNodeIds.length > 1 && dispatch(alignSelection(selectedNodeIds, axis)), [dispatch, selectedNodeIds]);
  const annotation = useCallback(() => dispatch(insertAnnotation("Nova anotação", canvasCenter(editor.viewport))), [dispatch, editor.viewport]);
  const viewport = useCallback((type: PidCanvasViewportAction["type"]) => setViewportAction((current) => ({ type, nonce: (current?.nonce ?? 0) + 1 })), []);

  const toolbarActions: EditorToolbarActions = {
    undo: () => { undo(); }, redo: () => { redo(); }, deleteSelection: () => { remove(); }, duplicate: () => { duplicate(); },
    copy: () => { copy(); }, paste: () => { paste(); }, rotate: (degrees) => { rotate(degrees); }, align: (axis) => { align(axis); },
    group: () => { group(); }, insertAnnotation: () => { annotation(); }, fit: () => viewport("fit"), zoomIn: () => viewport("zoom-in"),
    zoomOut: () => viewport("zoom-out"), setConnectionClass,
  };
  const shortcutActions: EditorShortcutActions = {
    undo, redo, deleteSelection: remove, duplicate, copy, paste,
    rotateClockwise: () => rotate(90), rotateCounterclockwise: () => rotate(-90), group,
    alignLeft: () => align("left"), insertAnnotation: annotation,
  };
  useEditorShortcuts({ editable: editable && !deleted, actions: shortcutActions });

  const reload = async () => {
    try {
      const remote = await documentPort.open(diagramId, editToken);
      store.replace(remote.document, "remote");
      setRevision(remote.revision);
      autosave.acceptRemoteRevision(remote.revision);
      setOperationError(null); setAnnouncement("Versão atual recarregada.");
    } catch (reason) { setOperationError(isPidDocumentError(reason) ? reason.message : "Não foi possível recarregar o diagrama."); }
  };

  return <main className="pid-focused-studio h-dvh grid grid-rows-[auto_1fr_auto]">
    <p className="sr-only">{editable ? "Acesso de edição" : "Acesso de visualização"}</p>
    <header className="pid-studio-header">
      <div className="pid-studio-identity"><Link to="/">Voltar ao DCOU</Link><div><h1>{editor.document.metadata.title}</h1><span>{standardLabel(editor.document.metadata.standard)}</span></div></div>
      <EditorToolbar editable={editable && !deleted} selectionCount={selectionCount} canUndo={editor.past.length > 0} canRedo={editor.future.length > 0} canPaste={clipboardRef.current !== null} connectionClass={connectionClass} actions={toolbarActions} />
      {editable && <div className="pid-studio-document-controls">
        <ShareDialog documentPort={documentPort} diagramId={diagramId} editToken={editToken} revision={revision} onRevision={setRevision} onEditToken={setEditToken} onAnnouncement={setAnnouncement} />
        <DocumentActionsMenu documentPort={documentPort} diagramId={diagramId} editToken={editToken} revision={revision} title={editor.document.metadata.title} deleted={deleted} onRevision={setRevision} onDeleted={setDeleted} onAnnouncement={setAnnouncement} />
      </div>}
    </header>
    <div className={`pid-studio-workspace ${catalogCollapsed ? "pid-catalog-collapsed" : ""} ${inspectorCollapsed ? "pid-inspector-collapsed" : ""}`}>
      <aside role="region" aria-label="Catálogo de símbolos" className="pid-studio-panel pid-catalog-panel">
        <button type="button" aria-expanded={!catalogCollapsed} onClick={() => setCatalogCollapsed((value) => !value)}>{catalogCollapsed ? "Abrir catálogo" : "Fechar catálogo"}</button>
        {!catalogCollapsed && (editable
          ? <CatalogPanel index={catalogIndex} standard={editor.document.metadata.standard} onInsert={(symbol) => { dispatch(insertSymbol(symbol, canvasCenter(editor.viewport))); }} />
          : <p>O catálogo está reservado neste acesso de visualização.</p>)}
      </aside>
      <section aria-label="Canvas P&ID" className="pid-studio-canvas">
        {deleted ? <div className="pid-deleted-blocker" role="alert"><h2>Diagrama excluído</h2><p>A edição está bloqueada até que o diagrama seja restaurado.</p></div>
          : <PidCanvas document={editor.document} catalog={catalogIndex} editable={editable} onCommand={dispatch} selection={canvasSelection} onSelectionChange={({ nodeIds, edgeIds }) => store.setSelection([...nodeIds, ...edgeIds])} activeConnectionClass={connectionClass} viewportAction={viewportAction} onViewportChange={(next) => store.setViewport(next)} className="pid-studio-canvas-surface" />}
        {autosave.error && <div role="alert" className="pid-editor-error"><p>{autosave.error}</p>{autosave.conflict && <button type="button" onClick={() => void reload()}>Recarregar diagrama</button>}</div>}
        {operationError && <p role="alert" className="pid-editor-error">{operationError}</p>}
      </section>
      <aside role="region" aria-label="Inspetor" className="pid-studio-panel pid-inspector-panel">
        <button type="button" aria-expanded={!inspectorCollapsed} onClick={() => setInspectorCollapsed((value) => !value)}>{inspectorCollapsed ? "Abrir inspetor" : "Fechar inspetor"}</button>
        {!inspectorCollapsed && <div><h2>Inspetor</h2><p>Selecione um elemento para editar suas propriedades.</p></div>}
      </aside>
    </div>
    <StatusBar state={editor} saveState={autosave.state} onRetry={!autosave.conflict && autosave.state === "Não salvo" ? autosave.retry : undefined} />
    <div className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>
  </main>;
}

function canvasCenter(viewport: { x: number; y: number; zoom: number }) {
  return { x: (400 - viewport.x) / viewport.zoom, y: (300 - viewport.y) / viewport.zoom };
}

function standardLabel(standard: string): string {
  return standard === "isa" ? "ISA" : standard === "iso" ? "ISO" : "Livre";
}
