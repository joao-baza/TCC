import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Link, useBlocker, useLocation, useParams } from "react-router-dom";

import { PanelLeftOpen, PanelLeftClose, PanelRightOpen, PanelRightClose } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isPidDocumentError, type OpenedPidDiagram } from "../api/contracts";
import { usePidServices } from "../api/pid-services";
import { PidCanvas, type PidCanvasSelection, type PidCanvasViewportAction } from "../canvas/pid-canvas";
import { createCatalogIndex } from "../catalog/catalog-index";
import { CatalogPanel } from "../catalog/catalog-panel";
import { CatalogZoomSlider } from "../catalog/catalog-zoom-slider";
import { localCatalog } from "../catalog/fixtures/catalog";
import { createLocalCollaboration } from "../collaboration/local-collaboration";
import {
  alignSelection, deleteSelection, groupSelection, insertAnnotation, insertSymbol, rotateSelection,
  type PidCommand,
} from "../domain/commands";
import { validateDocument } from "../domain/validation";
import { downloadBlob, pidExportFilename } from "../export/download";
import { renderPidPng } from "../export/render-png";
import { loadPidSvgAssets, renderPidSvg, type PidExportBackground, type PidSvgAssets } from "../export/render-svg";
import { copyEditorSelection, pasteEditorFragment, type EditorClipboardFragment } from "./editor-clipboard";
import {
  EditorToolbar, type EditorToolbarActions,
} from "./editor-toolbar";
import {
  getEditorPositionedSelectionIds, getEditorSelectionCapabilities,
} from "./editor-toolbar-utils";
import { createEditorStore, type EditorStore } from "./editor-store";
import { ShareDialog } from "./share-dialog";
import {
  PropertiesInspector, type InspectorCommandResult, type PropertiesInspectorHandle,
} from "./properties-inspector";
import { StatusBar } from "./status-bar";
import { useEditorAutosave } from "./use-editor-autosave";
import { MINIMUM_EDIT_VIEWPORT_WIDTH, useEditCapability } from "./use-edit-capability";
import { useEditorShortcuts, type EditorShortcutActions } from "./use-editor-shortcuts";
import { ValidationPanel } from "./validation-panel";
import { PidThemeProvider } from "./pid-theme-provider";
import { usePidSettings } from "./use-pid-settings";

const catalogIndex = createCatalogIndex(localCatalog);
const persistenceBlockFor = (document: Parameters<typeof validateDocument>[0]): string | null => {
  const blockingCount = validateDocument(document, { catalog: localCatalog })
    .filter((issue) => issue.severity === "error").length;
  return blockingCount > 0
    ? `Corrija os erros bloqueantes antes de salvar ou exportar (${blockingCount} restante${blockingCount === 1 ? "" : "s"}).`
    : null;
};

interface EditorSession {
  readonly diagramId: string;
  readonly opened: OpenedPidDiagram;
  readonly routeToken: string;
  readonly store: EditorStore;
}

type EditorLifecycle = "active" | "deleting" | "deleted" | "restoring";
type ExportFormat = "svg" | "png";

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
  const { editable: capabilityEditable, viewportWidth } = useEditCapability(opened.scope);
  const { settings, updateSetting } = usePidSettings();

  const textSizeClass = settings.textSize === "sm" ? "text-xs" : settings.textSize === "lg" ? "text-base" : "text-sm";
  const compactReadOnly = viewportWidth < MINIMUM_EDIT_VIEWPORT_WIDTH;
  const [editLease, setEditLease] = useState(capabilityEditable);
  const capabilityEditableRef = useRef(capabilityEditable);
  capabilityEditableRef.current = capabilityEditable;
  const [hasInspectorDrafts, setHasInspectorDrafts] = useState(false);
  const inspectorRef = useRef<PropertiesInspectorHandle>(null);
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
  const [exportBackground, setExportBackground] = useState<PidExportBackground>("white");
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const exportInFlightRef = useRef(false);
  const exportMountedRef = useRef(false);
  const assetCacheRef = useRef<{ signature: string; promise: Promise<PidSvgAssets> } | null>(null);
  const clipboardRef = useRef<EditorClipboardFragment | null>(null);
  const pasteCountRef = useRef(0);
  const autosave = useEditorAutosave({
    diagramId,
    editToken,
    revision,
    store,
    documentPort,
    editable: editLease,
    getPersistenceBlock: persistenceBlockFor,
    onRevision: setRevision,
  });
  useEffect(() => {
    exportMountedRef.current = true;
    return () => { exportMountedRef.current = false; };
  }, []);
  const collaboration = useMemo(() => createLocalCollaboration({
    participant: { id: `local:${diagramId}`, name: "Você", color: "#57b9d6", local: true },
  }), [diagramId]);
  const subscribeCollaboration = useCallback(
    (notify: () => void) => collaboration.subscribe(notify),
    [collaboration],
  );
  const collaborationSnapshot = useSyncExternalStore(
    subscribeCollaboration,
    collaboration.getSnapshot,
    collaboration.getSnapshot,
  );
  useEffect(() => collaboration.connect(), [collaboration]);
  useEffect(() => collaboration.subscribeDocument((update) => {
    if (update.origin !== "remote") return;
    store.replace(update.document, "remote");
    setRevision(update.revision);
    autosave.resumeRemote(update.revision);
  }), [autosave, collaboration, store]);
  useEffect(() => {
    if (autosave.conflict) collaboration.setStatus("reconnecting");
    else if (autosave.state !== "Sincronizado") collaboration.setStatus("unsaved");
    else collaboration.setStatus("synced");
  }, [autosave.conflict, autosave.state, collaboration]);
  const prepareInspectorDrafts = useCallback(
    () => inspectorRef.current?.prepareForReadOnly() ?? { hasUnresolvedDrafts: false },
    [],
  );
  const flushBeforeNavigation = useCallback(async () => {
    const prepared = prepareInspectorDrafts();
    if (prepared.hasUnresolvedDrafts) {
      throw new Error("Corrija o rascunho inválido no inspetor antes de navegar.");
    }
    return autosave.flush();
  }, [autosave.flush, prepareInspectorDrafts]);
  useEffect(() => registerNavigationGuard(flushBeforeNavigation), [flushBeforeNavigation, registerNavigationGuard]);
  useEffect(() => {
    if (capabilityEditable) {
      setEditLease(true);
      return;
    }
    if (!editLease) return;
    let active = true;
    prepareInspectorDrafts();
    void autosave.flush().catch(() => {
      if (capabilityEditableRef.current) autosave.retry();
    }).finally(() => {
      if (active) setEditLease(false);
    });
    return () => { active = false; };
  }, [autosave.flush, autosave.retry, capabilityEditable, editLease, prepareInspectorDrafts]);
  useEffect(() => {
    if (autosave.state === "Sincronizado" && !hasInspectorDrafts) return;
    const protectPendingSave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protectPendingSave);
    return () => window.removeEventListener("beforeunload", protectPendingSave);
  }, [autosave.state, hasInspectorDrafts]);
  const editorEnabled = capabilityEditable && editLease && lifecycle === "active";
  const selectedNodeIds = editor.selection.filter((id) => Boolean(editor.document.nodes[id]));
  const positionedSelectionIds = getEditorPositionedSelectionIds(editor.document, editor.selection);
  const activeSelectionCapabilities = useMemo(
    () => getEditorSelectionCapabilities(editor.document, editor.selection),
    [editor.document, editor.selection],
  );
  const selectionCapabilities = editorEnabled ? activeSelectionCapabilities : BLOCKED_SELECTION_CAPABILITIES;
  const validationIssues = useMemo(
    () => validateDocument(editor.document, { catalog: localCatalog }),
    [editor.document],
  );
  const validationCounts = useMemo(() => ({
    errors: validationIssues.filter((i) => i.severity === "error").length,
    warnings: validationIssues.filter((i) => i.severity === "warning").length,
  }), [validationIssues]);
  const exportErrors = useMemo(() => [...new Set(validationIssues
    .filter((issue) => issue.severity === "error")
    .map((issue) => issue.message))], [validationIssues]);
  const canExport = exportErrors.length === 0
    && lifecycle === "active"
    && autosave.state !== "Salvando"
    && exporting === null;
  const canvasSelection: PidCanvasSelection = useMemo(() => ({
    nodeIds: editor.selection.filter((id) => Boolean(editor.document.nodes[id])),
    edgeIds: editor.selection.filter((id) => Boolean(editor.document.edges[id])),
    annotationIds: editor.selection.filter((id) => Boolean(editor.document.annotations[id])),
  }), [editor.document.annotations, editor.document.edges, editor.document.nodes, editor.selection]);

  const draftBoundaryActiveRef = useRef(false);
  const afterInspectorDrafts = useCallback((operation: () => boolean, blockedMessage: string): boolean => {
    if (draftBoundaryActiveRef.current) return operation();
    draftBoundaryActiveRef.current = true;
    try {
      if (prepareInspectorDrafts().hasUnresolvedDrafts) {
        setAnnouncement(blockedMessage);
        return false;
      }
      return operation();
    } finally {
      draftBoundaryActiveRef.current = false;
    }
  }, [prepareInspectorDrafts]);
  const mutate = useCallback((operation: () => void): boolean => {
    if (!capabilityEditable || lifecycleRef.current !== "active") return false;
    return afterInspectorDrafts(() => {
      try { operation(); autosave.markLocalChange(); setOperationError(null); return true; }
      catch (reason) { setOperationError(reason instanceof Error ? reason.message : "A operação não pôde ser concluída."); return false; }
    }, "Corrija o rascunho no inspetor antes de continuar.");
  }, [afterInspectorDrafts, autosave, capabilityEditable]);
  const dispatch = useCallback((command: PidCommand) => mutate(() => store.dispatch(command)), [mutate, store]);
  const dispatchInspector = useCallback((command: PidCommand): InspectorCommandResult => {
    const field = inspectorCommandField(command);
    if (!editLease || lifecycleRef.current !== "active") {
      return { ok: false, field, message: "A edição não está disponível neste momento." };
    }
    try {
      // The draft boundary finalizes fields through this callback, so this command must not re-enter it.
      store.dispatch(command);
      autosave.markLocalChange();
      setOperationError(null);
      return { ok: true };
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "A operação não pôde ser concluída.";
      setOperationError(message);
      return { ok: false, field, message };
    }
  }, [autosave, editLease, store]);
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
  const duplicate = useCallback(() => {
    if (!selectionCapabilities.canDuplicate) return false;
    return mutate(() => {
      const state = store.getState();
      const fragment = copyEditorSelection(state.document, state.selection);
      clipboardRef.current = fragment;
      pasteCountRef.current = 0;
      const result = pasteEditorFragment(state.document, fragment, { offset: { x: 24, y: 24 } });
      store.replace(result.document, "local");
      store.setSelection(result.selection);
      pasteCountRef.current = 1;
      setAnnouncement("Seleção duplicada com novos identificadores.");
    });
  }, [mutate, selectionCapabilities.canDuplicate, store]);
  const undo = useCallback(() => editor.past.length > 0 && mutate(store.undo), [editor.past.length, mutate, store.undo]);
  const redo = useCallback(() => editor.future.length > 0 && mutate(store.redo), [editor.future.length, mutate, store.redo]);
  const remove = useCallback(() => selectionCapabilities.canDelete && dispatch(deleteSelection([...editor.selection])), [dispatch, editor.selection, selectionCapabilities.canDelete]);
  const rotate = useCallback((degrees: 90 | -90) => selectionCapabilities.canRotate && dispatch(rotateSelection(positionedSelectionIds, degrees)), [dispatch, positionedSelectionIds, selectionCapabilities.canRotate]);
  const group = useCallback(() => selectionCapabilities.canGroup && dispatch(groupSelection(selectedNodeIds)), [dispatch, selectedNodeIds, selectionCapabilities.canGroup]);
  const align = useCallback((axis: Parameters<EditorToolbarActions["align"]>[0]) => selectionCapabilities.canAlign && dispatch(alignSelection(positionedSelectionIds, axis)), [dispatch, positionedSelectionIds, selectionCapabilities.canAlign]);
  const annotation = useCallback(() => dispatch(insertAnnotation("Nova anotação", canvasCenter(editor.viewport))), [dispatch, editor.viewport]);
  const viewport = useCallback((type: PidCanvasViewportAction["type"]) => setViewportAction((current) => ({ type, nonce: (current?.nonce ?? 0) + 1 })), []);
  const select = useCallback((selection: readonly string[]): boolean => afterInspectorDrafts(() => {
    store.setSelection(selection);
    return true;
  }, "Corrija o rascunho no inspetor antes de trocar a seleção."), [afterInspectorDrafts, store]);
  const focusValidationIssue = useCallback((elementId: string) => {
    if (select([elementId])) setAnnouncement("Elemento afetado pela validação selecionado no inspetor.");
  }, [select]);
  const chooseConnectionClass = useCallback((value: ConnectionClass) => {
    afterInspectorDrafts(() => { setConnectionClass(value); return true; }, "Corrija o rascunho no inspetor antes de trocar a ferramenta de conexão.");
  }, [afterInspectorDrafts]);
  const exportDocument = useCallback(async (format: ExportFormat) => {
    if (exportInFlightRef.current || !canExport) return;
    exportInFlightRef.current = true;
    setExporting(format);
    try {
      const snapshot = store.getState().document;
      const symbolKeys = [...new Set(Object.values(snapshot.nodes).map((node) => node.symbolKey))].sort();
      const signature = symbolKeys.join("\u0000");
      if (assetCacheRef.current?.signature !== signature) {
        const relevantCatalog = localCatalog.filter((symbol) => symbolKeys.includes(symbol.key));
        assetCacheRef.current = { signature, promise: loadPidSvgAssets(relevantCatalog) };
      }
      const assetPromise = assetCacheRef.current.promise;
      let assets: PidSvgAssets;
      try {
        assets = await assetPromise;
      } catch (reason) {
        if (assetCacheRef.current?.promise === assetPromise) assetCacheRef.current = null;
        throw reason;
      }
      if (!exportMountedRef.current) return;
      const svg = await renderPidSvg(snapshot, assets, { background: exportBackground, padding: 24 });
      if (!exportMountedRef.current) return;
      if (format === "svg") {
        downloadBlob(
          new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
          pidExportFilename(snapshot.metadata.title, "svg"),
        );
        setAnnouncement("Documento P&ID exportado em SVG.");
      } else {
        const png = await renderPidPng(svg, { background: exportBackground });
        if (!exportMountedRef.current) return;
        downloadBlob(png, pidExportFilename(snapshot.metadata.title, "png"));
        setAnnouncement("Documento P&ID exportado em PNG.");
      }
      setOperationError(null);
    } catch {
      if (exportMountedRef.current) setOperationError(format === "png" ? "Não foi possível gerar PNG" : "Não foi possível gerar SVG");
    } finally {
      exportInFlightRef.current = false;
      if (exportMountedRef.current) setExporting(null);
    }
  }, [canExport, exportBackground, store]);

  const toolbarActions: EditorToolbarActions = {
    undo: () => { undo(); }, redo: () => { redo(); }, deleteSelection: () => { remove(); }, duplicate: () => { duplicate(); },
    copy: () => { copy(); }, paste: () => { paste(); }, rotate: (degrees) => { rotate(degrees); }, align: (axis) => { align(axis); },
    group: () => { group(); }, insertAnnotation: () => { annotation(); }, fit: () => viewport("fit"), zoomIn: () => viewport("zoom-in"),
    zoomOut: () => viewport("zoom-out"), setConnectionClass: chooseConnectionClass,
  };
  const shortcutActions: EditorShortcutActions = {
    undo, redo, deleteSelection: remove, duplicate, copy, paste,
    rotateClockwise: () => rotate(90), rotateCounterclockwise: () => rotate(-90), group,
    alignLeft: () => align("left"), insertAnnotation: annotation,
  };
  useEditorShortcuts({ editable: editorEnabled, actions: shortcutActions });

  const reload = async () => {
    if (!afterInspectorDrafts(() => true, "Corrija o rascunho no inspetor antes de recarregar o diagrama.")) return;
    try {
      const remote = await documentPort.open(diagramId, editToken);
      store.replace(remote.document, "remote");
      setRevision(remote.revision);
      autosave.resumeRemote(remote.revision);
      setOperationError(null); setAnnouncement("Versão atual recarregada.");
    } catch (reason) { setOperationError(isPidDocumentError(reason) ? reason.message : "Não foi possível recarregar o diagrama."); }
  };

  const beforeDelete = useCallback(async () => {
    if (!afterInspectorDrafts(() => true, "Corrija o rascunho no inspetor antes de excluir o diagrama.")) {
      throw new Error("Corrija o rascunho no inspetor antes de excluir o diagrama.");
    }
    lifecycleRef.current = "deleting";
    setLifecycle("deleting");
    setOperationError(null);
    return autosave.suspend();
  }, [afterInspectorDrafts, autosave]);
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

  return <PidThemeProvider>
    <main className={cn("pid-focused-studio h-dvh grid grid-rows-[auto_1fr_auto]", textSizeClass)}>
    <p className="sr-only">{capabilityEditable ? "Acesso de edição" : "Acesso de visualização"}</p>
    <header className="pid-studio-header">
      <div className="pid-studio-identity"><Link className="inline-flex min-h-11 min-w-11 items-center" to="/">Voltar ao DCOU</Link><div><h1>{editor.document.metadata.title}</h1></div></div>
      <EditorToolbar editable={editorEnabled} capabilities={selectionCapabilities} canUndo={editor.past.length > 0} canRedo={editor.future.length > 0} canPaste={editorEnabled && clipboardRef.current !== null} canExport={canExport} exporting={exporting !== null} exportErrors={exportErrors} exportBackground={exportBackground} onExportBackgroundChange={setExportBackground} onExportSvg={() => { void exportDocument("svg"); }} onExportPng={() => { void exportDocument("png"); }} connectionClass={connectionClass} actions={toolbarActions} iconSize={settings.iconSize} />
      <div className="pid-studio-session-controls">
        {capabilityEditable && <div className="pid-studio-document-controls">
          {editorEnabled && <ShareDialog documentPort={documentPort} diagramId={diagramId} editToken={editToken} revision={revision} onRevision={setRevision} onEditToken={setEditToken} onAnnouncement={setAnnouncement} />}
          </div>}
      </div>
    </header>
    <div className={`pid-studio-workspace ${!editorEnabled ? "pid-workspace-readonly" : ""} ${catalogCollapsed ? "pid-catalog-collapsed" : ""} ${inspectorCollapsed ? "pid-inspector-collapsed" : ""}`}>
      {compactReadOnly && <p className="pid-compact-readonly-notice" role="status">Edição disponível em telas a partir de 768 px</p>}
      {editorEnabled && <aside role="region" aria-label="Catálogo de símbolos" className="pid-studio-panel pid-catalog-panel">
        {!catalogCollapsed && <>
          <CatalogPanel headerAction={
            <Tooltip>
              <TooltipTrigger render={
                <Button variant="ghost" size="icon-sm" aria-expanded={!catalogCollapsed} aria-label="Fechar catálogo" onClick={() => setCatalogCollapsed(true)}>
                  <PanelLeftClose className="size-4" />
                </Button>
              } />
              <TooltipContent>Fechar catálogo</TooltipContent>
            </Tooltip>
          } index={catalogIndex} standard={editor.document.metadata.standard} onInsert={(symbol) => { dispatch(insertSymbol(symbol, canvasCenter(editor.viewport))); }} thumbSize={settings.catalogThumbSize} />
          <CatalogZoomSlider value={settings.catalogThumbSize} onChange={(value) => updateSetting("catalogThumbSize", value)} />
        </>}
        {catalogCollapsed && <div className="flex justify-center"><Tooltip>
          <TooltipTrigger render={
            <Button variant="ghost" size="icon-sm" aria-label="Abrir catálogo" onClick={() => setCatalogCollapsed(false)}>
              <PanelLeftOpen className="size-4" />
            </Button>
          } />
          <TooltipContent>Abrir catálogo</TooltipContent>
        </Tooltip></div>}
      </aside>}
      <section aria-label="Canvas P&ID" className="pid-studio-canvas">
        {lifecycle !== "active" ? <div className="pid-deleted-blocker" role="alert"><h2>{lifecycle === "deleting" ? "Excluindo diagrama" : lifecycle === "restoring" ? "Restaurando diagrama" : "Diagrama excluído"}</h2><p>A edição está bloqueada até que o diagrama seja restaurado.</p></div>
          : <PidCanvas document={editor.document} catalog={catalogIndex} editable={editorEnabled} onCommand={dispatch} selection={canvasSelection} onSelectionChange={({ nodeIds, edgeIds, annotationIds = [] }) => {
            select([...nodeIds, ...edgeIds, ...annotationIds]);
          }} activeConnectionClass={connectionClass} viewportAction={viewportAction} onViewportChange={(next) => store.setViewport(next)} className="pid-studio-canvas-surface" />}
        {autosave.error && <div role="alert" className="pid-editor-error"><p>{autosave.error}</p>{capabilityEditable && autosave.conflict && <button type="button" onClick={() => void reload()}>Recarregar diagrama</button>}</div>}
        {operationError && <p role="alert" className="pid-editor-error">{operationError}</p>}
      </section>
      <aside role="region" aria-label="Inspetor" className="pid-studio-panel pid-inspector-panel">
        {inspectorCollapsed ? <div className="flex justify-center"><Tooltip>
          <TooltipTrigger render={
            <Button variant="ghost" size="icon-sm" aria-label="Abrir inspetor" onClick={() => setInspectorCollapsed(false)}>
              <PanelRightOpen className="size-4" />
            </Button>
          } />
          <TooltipContent>Abrir inspetor</TooltipContent>
        </Tooltip></div>
        : <><Tooltip>
          <TooltipTrigger render={
            <Button variant="ghost" size="icon-sm" aria-expanded={!inspectorCollapsed} aria-label="Fechar inspetor" onClick={() => {
              if (prepareInspectorDrafts().hasUnresolvedDrafts) {
                setAnnouncement("Corrija o rascunho no inspetor antes de fechá-lo.");
                return;
              }
              setInspectorCollapsed(true);
            }}>
              <PanelRightClose className="size-4" />
            </Button>
          } />
          <TooltipContent>Fechar inspetor</TooltipContent>
        </Tooltip></>}
        {!inspectorCollapsed && <div className="flex-1 min-h-0 overflow-auto pid-scrollable">
          <div className="pid-inspector-content">
            <PropertiesInspector ref={inspectorRef} document={editor.document} selection={editor.selection} editable={editorEnabled} commitAllowed={editLease && lifecycle === "active"} onCommand={dispatchInspector} onDraftStateChange={setHasInspectorDrafts} />
            <ValidationPanel issues={validationIssues} onFocusElement={focusValidationIssue} />
          </div>
        </div>}
      </aside>
    </div>
    <StatusBar state={editor} saveState={autosave.state} validationCounts={validationCounts} onRetry={capabilityEditable && !autosave.conflict && !autosave.validationBlocked && autosave.state === "Não salvo" ? autosave.retry : undefined} />
    <div className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>
  </main>
  </PidThemeProvider>;
}

function canvasCenter(viewport: { x: number; y: number; zoom: number }) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return { x: (w / 2 - viewport.x) / viewport.zoom, y: (h / 2 - viewport.y) / viewport.zoom };
}


function inspectorCommandField(command: PidCommand): string {
  if (command.type !== "element.patch") return "properties";
  return Object.keys(command.patch)[0] ?? "properties";
}
