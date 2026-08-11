import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { isPidDocumentError, type PidDocumentPort } from "../api/contracts";

export function DocumentDeleteButton({ documentPort, diagramId, editToken, revision, title, onBeforeDelete, onDeleted, onDeleteFailed, onAnnouncement }: {
  readonly documentPort: PidDocumentPort;
  readonly diagramId: string;
  readonly editToken: string;
  readonly revision: number;
  readonly title: string;
  readonly onBeforeDelete: () => Promise<number>;
  readonly onDeleted: (revision: number) => void;
  readonly onDeleteFailed: (revision: number) => void;
  readonly onAnnouncement: (message: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);
  const activeRef = useRef(true);
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
      onDeleted(next); setConfirming(false); setConfirmation("");
      onAnnouncement("Diagrama excluído. Retornando para a listagem P&ID.");
    } catch (reason) {
      if (!activeRef.current) return;
      onDeleteFailed(expectedRevision);
      fail(reason, "Não foi possível excluir o diagrama.");
    } finally { if (activeRef.current) setBusy(false); }
  };
  return <div className="pid-document-actions">
    <Tooltip>
      <TooltipTrigger render={
        <Button ref={deleteTriggerRef} type="button" variant="ghost" size="icon-sm" aria-label="Excluir diagrama" disabled={busy} onClick={() => setConfirming(true)}>
          <Trash2 className="size-4" />
        </Button>
      } />
      <TooltipContent>Excluir diagrama</TooltipContent>
    </Tooltip>
    <AlertDialog open={confirming} onOpenChange={(nextOpen) => {
      if (busy) return;
      setConfirming(nextOpen);
      if (!nextOpen) setConfirmation("");
    }}>
      <AlertDialogContent className="pid-modal-card" initialFocus={inputRef} finalFocus={deleteTriggerRef}>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir diagrama</AlertDialogTitle>
          <AlertDialogDescription>Digite o título exato para confirmar. Após a exclusão, você será redirecionado para a listagem P&ID.</AlertDialogDescription>
        </AlertDialogHeader>
        <label>Digite {title} para confirmar<input ref={inputRef} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
        {error && <p role="alert">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmation("")}>Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={busy || confirmation !== title} onClick={() => void remove()}>Confirmar exclusão</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}
