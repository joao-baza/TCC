import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Link, useBlocker, useLocation, useParams } from "react-router-dom";

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
import { validateDocument } from "../domain/validation";
import { DocumentActionsMenu } from "./document-actions-menu";
import { copyEditorSelection, pasteEditorFragment, type EditorClipboardFragment } from "./editor-clipboard";
import {
  EditorToolbar, getEditorPositionedSelectionIds, getEditorSelectionCapabilities, type EditorToolbarActions,
} from "./editor-toolbar";
import { createEditorStore, type EditorStore } from "./editor-store";
import { ShareDialog } from "./share-dialog";
import { PropertiesInspector } from "./properties-inspector";
import { StatusBar } from "./status-bar";
import { useEditorAutosave } from "./use-editor-autosave";
import { useEditorShortcuts, type EditorShortcutActions } from "./use-editor-shortcuts";
import { ValidationPanel } from "./validation-panel";

const catalogIndex = createCatalogIndex(localCatalog);

interface EditorSession {
  readonly diagramId: string;
  readonly opened: OpenedPidDiagram;
  readonly routeToken: string;
  readonly store: EditorStore;
}

type EditorLifecycle = "active" | "deleting" | "deleted" | "restoring";

const BLOCKED_SELECTION_CAPABILITIES = Object.freeze({
  canDelete: false,
  canCopy: false,
  canDuplicate: false,
  canRotate: false,
  canGroup: false,
  canAlign: false,
});

export function PidEditorPage() {
  const { document: documentPort } = usePidServices();
  const { diagramId = "" } = useParams();
  const { hash } = useLocation();
  const [session, setSession] = useState<EditorSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const [navigationRetry, setNavigationRetry] = useState(0);
  const [navigationGuard, setNavigationGuard] = useState<(() => Promise<number>) | null>(null);
  const navigationBlocker = useBlocker(navigationGuard !== null);
  const token = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash).get("access") ?? "";
  const registerNavigationGuard = useCallback((guard: () => Promise<number>) => {
    setNavigationGuard(() => guard);
    return () => setNavigationGuard((current) => current === guard ? null : current);
  }, []);

  useEffect(() => {
    if (navigationBlocker.state !== "blocked" || !navigationGuard) return;
    let active = true;
    setNavigationError(null);
    void navigationGuard().then(
      () => { if (active) navigationBlocker.proceed(); },
      () => {
        if (active) setNavigationError("Não foi possível salvar o diagrama antes de navegar. Verifique a conexão e tente novamente.");
      },
    );
    return () => { active = false; };
  }, [navigationBlocker, navigationGuard, navigationRetry]);

  useEffect(() => {
    let active = true;
    setError(null);
    void (async () => {
      if (!diagramId || !token) {
        setError("O link do diagrama não contém uma credencial de acesso válida.");
        return;
      }
      setSession(null);
      try {
        const opened = await documentPort.open(diagramId, token);
        if (!active) return;
        setSession({ diagramId, opened, routeToken: token, store: createEditorStore(opened.document) });
      } catch (reason) {
        if (!active) return;
        setError(isPidDocumentError(reason) ? reason.message : "Não foi possível abrir o diagrama.");
      }
    })();
    return () => { active = false; };
  }, [diagramId, documentPort, token]);

  if (!session) return <main className="pid-editor-loading"><h1>Editor P&amp;ID</h1>{error
    ? <p role="alert">{error}</p>
    : <p role="status">Carregando diagrama…</p>}<Link to="/">Voltar ao DCOU</Link></main>;
  return <>{navigationError && navigationBlocker.state === "blocked" && <div className="pid-navigation-error" role="alert"><p>{navigationError}</p><button type="button" onClick={() => setNavigationRetry((value) => value + 1)}>Tentar navegar novamente</button><button type="button" onClick={() => { navigationBlocker.reset(); setNavigationError(null); }}>Permanecer no editor</button></div>}
    <EditorStudio key={`${session.diagramId}:${session.routeToken}`} diagramId={session.diagramId} session={session} registerNavigationGuard={registerNavigationGuard} />
  </>;
}

function EditorStudio({ diagramId, session, registerNavigationGuard }: {
  diagramId: string;
  session: EditorSession;
  registerNavigationGuard: (guard: () => Promise<number>) => () => void;
}) {
  const { document: documentPort } = usePidServices();
  const { store, opened } = session;
  const subscribe = useCallback((notify: () => void) => store.subscribe(() => notify()), [store]);
  const editor = useSyncExternalStore(subscribe, store.getState, store.getState);
  const editable = opened.scope === "edit";
  const [revision, setRevision] = useState(opened.revision);
  const [editToken, setEditToken] = useState(session.routeToken);
  const [lifecycle, setLifecycle] = useState<EditorLifecycle>("active");
  const lifecycleRef = useRef<EditorLifecycle>("active");
  const [catalogCollapsed, setCatalogCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [connectionClass, setConnectionClass] = useState<ConnectionClass>("process");
  const [viewportAction, setViewportAction] = useState<PidCanvasViewportAction>();
  const [announcement, setAnnouncement] = useState("");
  const [operationError, setOperationError] = useState<string | null>(null);
  const clipboardRef = useRef<EditorClipboardFragment | null>(null);
  const pasteCountRef = useRef(0);
  const autosave = useEditorAutosave({ diagramId, editToken, revision, store, documentPort, editable, onRevision: setRevision });
  useEffect(() => registerNavigationGuard(autosave.flush), [autosave.flush, registerNavigationGuard]);
  useEffect(() => {
    if (!editable || autosave.state === "Sincronizado") return;
    const protectPendingSave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protectPendingSave);
    return () => window.removeEventListener("beforeunload", protectPendingSave);
  }, [autosave.state, editable]);
  const editorEnabled = editable && lifecycle === "active";
  const selectedNodeIds = editor.selection.filter((id) => Boolean(editor.document.nodes[id]));
  const positionedSelectionIds = getEditorPositionedSelectionIds(editor.document, editor.selection);
  const activeSelectionCapabilities = useMemo(
    () => getEditorSelectionCapabilities(editor.document, editor.selection),
    [editor.document, editor.selection],
  );
  const selectionCapabilities = lifecycle === "active" ? activeSelectionCapabilities : BLOCKED_SELECTION_CAPABILITIES;
  const validationIssues = useMemo(
    () => validateDocument(editor.document, { catalog: localCatalog }),
    [editor.document],
  );
  const canvasSelection: PidCanvasSelection = useMemo(() => ({
    nodeIds: editor.selection.filter((id) => Boolean(editor.document.nodes[id])),
    edgeIds: editor.selection.filter((id) => Boolean(editor.document.edges[id])),
    annotationIds: editor.selection.filter((id) => Boolean(editor.document.annotations[id])),
  }), [editor.document.annotations, editor.document.edges, editor.document.nodes, editor.selection]);

  const mutate = useCallback((operation: () => void): boolean => {
    if (!editable || lifecycleRef.current !== "active") return false;
    try { operation(); autosave.markLocalChange(); setOperationError(null); return true; }
    catch (reason) { setOperationError(reason instanceof Error ? reason.message : "A operação não pôde ser concluída."); return false; }
  }, [autosave, editable]);
  const dispatch = useCallback((command: PidCommand) => mutate(() => store.dispatch(command)), [mutate, store]);
  const copy = useCallback((): boolean => {
    if (!selectionCapabilities.canCopy) return false;
    try {
      clipboardRef.current = copyEditorSelection(editor.document, editor.selection);
      pasteCountRef.current = 0;
      setAnnouncement("Seleção copiada para o clipboard interno do editor.");
      return true;
    } catch (reason) { setOperationError(reason instanceof Error ? reason.message : "Não foi possível copiar a seleção."); return false; }
  }, [editor.document, editor.selection, selectionCapabilities.canCopy]);
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
  const duplicate = useCallback(() => selectionCapabilities.canDuplicate && copy() && paste(), [copy, paste, selectionCapabilities.canDuplicate]);
  const undo = useCallback(() => editor.past.length > 0 && mutate(store.undo), [editor.past.length, mutate, store.undo]);
  const redo = useCallback(() => editor.future.length > 0 && mutate(store.redo), [editor.future.length, mutate, store.redo]);
  const remove = useCallback(() => selectionCapabilities.canDelete && dispatch(deleteSelection([...editor.selection])), [dispatch, editor.selection, selectionCapabilities.canDelete]);
  const rotate = useCallback((degrees: 90 | -90) => selectionCapabilities.canRotate && dispatch(rotateSelection(positionedSelectionIds, degrees)), [dispatch, positionedSelectionIds, selectionCapabilities.canRotate]);
  const group = useCallback(() => selectionCapabilities.canGroup && dispatch(groupSelection(selectedNodeIds)), [dispatch, selectedNodeIds, selectionCapabilities.canGroup]);
  const align = useCallback((axis: Parameters<EditorToolbarActions["align"]>[0]) => selectionCapabilities.canAlign && dispatch(alignSelection(positionedSelectionIds, axis)), [dispatch, positionedSelectionIds, selectionCapabilities.canAlign]);
  const annotation = useCallback(() => dispatch(insertAnnotation("Nova anotação", canvasCenter(editor.viewport))), [dispatch, editor.viewport]);
  const viewport = useCallback((type: PidCanvasViewportAction["type"]) => setViewportAction((current) => ({ type, nonce: (current?.nonce ?? 0) + 1 })), []);
  const focusValidationIssue = useCallback((elementId: string) => {
    store.setSelection([elementId]);
    setAnnouncement("Elemento afetado pela validação selecionado no inspetor.");
  }, [store]);

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
  useEditorShortcuts({ editable: editorEnabled, actions: shortcutActions });

  const reload = async () => {
    try {
      const remote = await documentPort.open(diagramId, editToken);
      store.replace(remote.document, "remote");
      setRevision(remote.revision);
      autosave.resumeRemote(remote.revision);
      setOperationError(null); setAnnouncement("Versão atual recarregada.");
    } catch (reason) { setOperationError(isPidDocumentError(reason) ? reason.message : "Não foi possível recarregar o diagrama."); }
  };

  const beforeDelete = useCallback(async () => {
    lifecycleRef.current = "deleting";
    setLifecycle("deleting");
    setOperationError(null);
    return autosave.suspend();
  }, [autosave]);
  const deletedSuccessfully = useCallback((nextRevision: number) => {
    setRevision(nextRevision);
    lifecycleRef.current = "deleted";
    setLifecycle("deleted");
  }, []);
  const deleteFailed = useCallback((currentRevision: number) => {
    const preservedRevision = autosave.resumeLocal(currentRevision);
    setRevision((previous) => Math.max(previous, preservedRevision));
    lifecycleRef.current = "active";
    setLifecycle("active");
  }, [autosave]);
  const beforeRestore = useCallback(() => {
    lifecycleRef.current = "restoring";
    setLifecycle("restoring");
    setOperationError(null);
  }, []);
  const restoreConfirmed = useCallback((nextRevision: number) => {
    setRevision(nextRevision);
    lifecycleRef.current = "restoring";
    setLifecycle("restoring");
  }, []);
  const restoredSuccessfully = useCallback(async (nextRevision: number) => {
    const remote = await documentPort.open(diagramId, editToken);
    if (remote.scope !== "edit") throw new Error("A restauração não devolveu acesso de edição ao diagrama.");
    store.replace(remote.document, "remote");
    const restoredRevision = Math.max(nextRevision, remote.revision);
    setRevision(restoredRevision);
    autosave.resumeRemote(restoredRevision);
    lifecycleRef.current = "active";
    setLifecycle("active");
  }, [autosave, diagramId, documentPort, editToken, store]);
  const restoreFailed = useCallback(() => {
    lifecycleRef.current = "deleted";
    setLifecycle("deleted");
  }, []);

  return <main className="pid-focused-studio h-dvh grid grid-rows-[auto_1fr_auto]">
    <p className="sr-only">{editable ? "Acesso de edição" : "Acesso de visualização"}</p>
    <header className="pid-studio-header">
      <div className="pid-studio-identity"><Link to="/">Voltar ao DCOU</Link><div><h1>{editor.document.metadata.title}</h1><span>{standardLabel(editor.document.metadata.standard)}</span></div></div>
      <EditorToolbar editable={editorEnabled} capabilities={selectionCapabilities} canUndo={editor.past.length > 0} canRedo={editor.future.length > 0} canPaste={editorEnabled && clipboardRef.current !== null} connectionClass={connectionClass} actions={toolbarActions} />
      {editable && <div className="pid-studio-document-controls">
        {editorEnabled && <ShareDialog documentPort={documentPort} diagramId={diagramId} editToken={editToken} revision={revision} onRevision={setRevision} onEditToken={setEditToken} onAnnouncement={setAnnouncement} />}
        <DocumentActionsMenu documentPort={documentPort} diagramId={diagramId} editToken={editToken} revision={revision} title={editor.document.metadata.title} deleted={lifecycle === "deleted" || lifecycle === "restoring"} onBeforeDelete={beforeDelete} onDeleted={deletedSuccessfully} onDeleteFailed={deleteFailed} onBeforeRestore={beforeRestore} onRestoreConfirmed={restoreConfirmed} onRestored={restoredSuccessfully} onRestoreFailed={restoreFailed} onAnnouncement={setAnnouncement} />
      </div>}
    </header>
    <div className={`pid-studio-workspace ${catalogCollapsed ? "pid-catalog-collapsed" : ""} ${inspectorCollapsed ? "pid-inspector-collapsed" : ""}`}>
      <aside role="region" aria-label="Catálogo de símbolos" className="pid-studio-panel pid-catalog-panel">
        <button type="button" aria-expanded={!catalogCollapsed} onClick={() => setCatalogCollapsed((value) => !value)}>{catalogCollapsed ? "Abrir catálogo" : "Fechar catálogo"}</button>
        {!catalogCollapsed && (editorEnabled
          ? <CatalogPanel index={catalogIndex} standard={editor.document.metadata.standard} onInsert={(symbol) => { dispatch(insertSymbol(symbol, canvasCenter(editor.viewport))); }} />
          : <p>{editable ? "O catálogo fica bloqueado enquanto o diagrama está indisponível." : "O catálogo está reservado neste acesso de visualização."}</p>)}
      </aside>
      <section aria-label="Canvas P&ID" className="pid-studio-canvas">
        {lifecycle !== "active" ? <div className="pid-deleted-blocker" role="alert"><h2>{lifecycle === "deleting" ? "Excluindo diagrama" : lifecycle === "restoring" ? "Restaurando diagrama" : "Diagrama excluído"}</h2><p>A edição está bloqueada até que o diagrama seja restaurado.</p></div>
          : <PidCanvas document={editor.document} catalog={catalogIndex} editable={editable} onCommand={dispatch} selection={canvasSelection} onSelectionChange={({ nodeIds, edgeIds, annotationIds = [] }) => store.setSelection([...nodeIds, ...edgeIds, ...annotationIds])} activeConnectionClass={connectionClass} viewportAction={viewportAction} onViewportChange={(next) => store.setViewport(next)} className="pid-studio-canvas-surface" />}
        {autosave.error && <div role="alert" className="pid-editor-error"><p>{autosave.error}</p>{autosave.conflict && <button type="button" onClick={() => void reload()}>Recarregar diagrama</button>}</div>}
        {operationError && <p role="alert" className="pid-editor-error">{operationError}</p>}
      </section>
      <aside role="region" aria-label="Inspetor" className="pid-studio-panel pid-inspector-panel">
        <button type="button" aria-expanded={!inspectorCollapsed} onClick={() => setInspectorCollapsed((value) => !value)}>{inspectorCollapsed ? "Abrir inspetor" : "Fechar inspetor"}</button>
        {!inspectorCollapsed && <div className="pid-inspector-content">
          <PropertiesInspector document={editor.document} selection={editor.selection} editable={editorEnabled} onCommand={dispatch} commandError={operationError} />
          <ValidationPanel issues={validationIssues} onFocusElement={focusValidationIssue} />
        </div>}
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
