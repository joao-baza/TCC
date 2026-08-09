import { useEffect, useRef, useState } from "react";

import { isPidDocumentError, type PidDocumentPort } from "../api/contracts";

export function DocumentActionsMenu({ documentPort, diagramId, editToken, revision, title, deleted, onBeforeDelete, onDeleted, onDeleteFailed, onBeforeRestore, onRestoreConfirmed, onRestored, onRestoreFailed, onAnnouncement }: {
  readonly documentPort: PidDocumentPort;
  readonly diagramId: string;
  readonly editToken: string;
  readonly revision: number;
  readonly title: string;
  readonly deleted: boolean;
  readonly onBeforeDelete: () => Promise<number>;
  readonly onDeleted: (revision: number) => void;
  readonly onDeleteFailed: (revision: number) => void;
  readonly onBeforeRestore: () => void;
  readonly onRestoreConfirmed: (revision: number) => void;
  readonly onRestored: (revision: number) => Promise<void>;
  readonly onRestoreFailed: () => void;
  readonly onAnnouncement: (message: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedRestoreRevision, setConfirmedRestoreRevision] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const activeRef = useRef(true);
  useEffect(() => { if (confirming) inputRef.current?.focus(); }, [confirming]);
  useEffect(() => {
    activeRef.current = true;
    return () => { activeRef.current = false; };
  }, []);
  const fail = (reason: unknown, fallback: string) => setError(isPidDocumentError(reason) ? reason.message : fallback);
  const remove = async () => {
    if (confirmation !== title) return;
    setBusy(true); setError(null);
    let expectedRevision = revision;
    try {
      expectedRevision = await onBeforeDelete();
      if (!activeRef.current) return;
      const next = await documentPort.softDelete(diagramId, editToken, expectedRevision);
      if (!activeRef.current) return;
      onDeleted(next); setConfirming(false); setMenuOpen(false); setConfirmation("");
      onAnnouncement("Diagrama excluído. Ele pode ser restaurado durante o prazo de retenção.");
    } catch (reason) {
      if (!activeRef.current) return;
      onDeleteFailed(expectedRevision);
      fail(reason, "Não foi possível excluir o diagrama.");
    } finally { if (activeRef.current) setBusy(false); }
  };
  const restore = async () => {
    setBusy(true); setError(null);
    let confirmedRevision = confirmedRestoreRevision;
    if (confirmedRevision === null) onBeforeRestore();
    try {
      if (confirmedRevision === null) {
        confirmedRevision = await documentPort.restore(diagramId, editToken, revision);
        if (!activeRef.current) return;
        setConfirmedRestoreRevision(confirmedRevision);
        onRestoreConfirmed(confirmedRevision);
      }
      await onRestored(confirmedRevision);
      if (!activeRef.current) return;
      setConfirmedRestoreRevision(null);
      onAnnouncement("Diagrama restaurado.");
    } catch (reason) {
      if (!activeRef.current) return;
      if (confirmedRevision === null) onRestoreFailed();
      fail(reason, confirmedRevision === null
        ? "Não foi possível restaurar o diagrama."
        : "O diagrama foi restaurado, mas não foi possível recarregá-lo.");
    } finally { if (activeRef.current) setBusy(false); }
  };
  if (deleted) return <div><button type="button" disabled={busy} onClick={() => void restore()}>{confirmedRestoreRevision === null ? "Restaurar diagrama" : "Tentar recuperar diagrama"}</button>{error && <p role="alert">{error}</p>}</div>;
  return <div className="pid-document-actions">
    <button ref={menuTriggerRef} type="button" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>Ações do documento</button>
    {menuOpen && <div role="menu"><button role="menuitem" type="button" onClick={() => setConfirming(true)}>Excluir diagrama</button></div>}
    {confirming && <div className="pid-modal-backdrop" onKeyDown={(event) => { if (event.key === "Escape") { setConfirming(false); setConfirmation(""); queueMicrotask(() => menuTriggerRef.current?.focus()); } }}><section role="alertdialog" aria-modal="true" aria-labelledby="pid-delete-title" className="pid-modal-card">
      <h2 id="pid-delete-title">Excluir diagrama</h2>
      <p>Digite o título exato para confirmar. Esta exclusão é reversível durante o prazo de retenção.</p>
      <label>Digite {title} para confirmar<input ref={inputRef} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
      {error && <p role="alert">{error}</p>}
      <button type="button" onClick={() => { setConfirming(false); setConfirmation(""); queueMicrotask(() => menuTriggerRef.current?.focus()); }}>Cancelar</button>
      <button type="button" disabled={busy || confirmation !== title} onClick={() => void remove()}>Confirmar exclusão</button>
    </section></div>}
  </div>;
}
