import { useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";

import { isPidDocumentError, type AccessScope, type PidDocumentPort } from "../api/contracts";

export function ShareDialog({ documentPort, diagramId, editToken, revision, onRevision, onEditToken, onAnnouncement }: {
  readonly documentPort: PidDocumentPort;
  readonly diagramId: string;
  readonly editToken: string;
  readonly revision: number;
  readonly onRevision: (revision: number) => void;
  readonly onEditToken: (token: string) => void;
  readonly onAnnouncement: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<AccessScope | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryScope, setRetryScope] = useState<AccessScope | null>(null);
  const [links, setLinks] = useState<Partial<Record<AccessScope, string>>>({});
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const regenerate = async (scope: AccessScope) => {
    setBusy(scope); setError(null); setRetryScope(null);
    try {
      const result = await documentPort.regenerate(diagramId, editToken, scope, revision);
      const url = new URL(`/pid/${diagramId}#access=${encodeURIComponent(result.token)}`, window.location.origin).toString();
      if (scope === "edit") {
        onEditToken(result.token);
        window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}#access=${encodeURIComponent(result.token)}`);
      }
      onRevision(result.revision);
      setLinks((current) => ({ ...current, [scope]: url }));
      onAnnouncement(scope === "edit" ? "Novo link de edição gerado. O anterior foi invalidado." : "Novo link de visualização gerado. O anterior foi invalidado.");
    } catch (reason) {
      setError(isPidDocumentError(reason) && reason.code === "CONFLICT"
        ? "O diagrama mudou em outra janela. Feche e recarregue antes de gerar outro link."
        : isPidDocumentError(reason) ? reason.message : "Não foi possível gerar o link.");
      setRetryScope(isPidDocumentError(reason) && reason.code === "CONFLICT" ? null : scope);
    } finally { setBusy(null); }
  };
  const copy = async (scope: AccessScope) => {
    const value = links[scope];
    if (!value) return;
    try { await navigator.clipboard.writeText(value); onAnnouncement("Link copiado."); }
    catch { setError("Não foi possível copiar automaticamente. Selecione o link e copie manualmente."); }
  };

  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Trigger ref={triggerRef}>Compartilhar</Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Backdrop className="pid-modal-backdrop" />
      <Dialog.Popup className="pid-modal-card pid-modal-popup" initialFocus={closeRef} finalFocus={triggerRef}>
        <header><Dialog.Title>Compartilhar diagrama</Dialog.Title><Dialog.Close ref={closeRef} aria-label="Fechar compartilhamento">×</Dialog.Close></header>
        <Dialog.Description>Gerar um novo link invalida imediatamente o link anterior do mesmo tipo.</Dialog.Description>
        <button type="button" disabled={busy !== null} onClick={() => void regenerate("view")}>Gerar novo link de visualização</button>
        <button type="button" disabled={busy !== null} onClick={() => void regenerate("edit")}>Gerar novo link de edição</button>
        {(["view", "edit"] as const).map((scope) => links[scope] && <label key={scope}>Novo link de {scope === "view" ? "visualização" : "edição"}
          <input readOnly value={links[scope]} onFocus={(event) => event.currentTarget.select()} />
          <button type="button" onClick={() => void copy(scope)}>Copiar link de {scope === "view" ? "visualização" : "edição"}</button>
        </label>)}
        {error && <p role="alert">{error}</p>}
        {retryScope && <button type="button" onClick={() => void regenerate(retryScope)}>Tentar gerar novamente</button>}
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>;
}
