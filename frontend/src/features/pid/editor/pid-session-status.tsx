import { CloudAlert, CloudCheck, LoaderCircle, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CollaborationSnapshot } from "../collaboration/contracts";
import type { EditorSaveState } from "./use-editor-autosave";

export interface PidSessionStatusProps {
  readonly saveState: EditorSaveState;
  readonly collaboration: CollaborationSnapshot;
  readonly conflict?: boolean;
  readonly onRetry?: () => void;
}

export function PidSessionStatus({ saveState, collaboration, conflict = false, onRetry }: PidSessionStatusProps) {
  const sessionState = conflict ? "conflict" : collaboration.status;
  const SaveIcon = conflict || saveState === "Não salvo"
    ? CloudAlert
    : saveState === "Salvando" || collaboration.status === "connecting"
      ? LoaderCircle
      : CloudCheck;
  const saveLabel = conflict ? "Conflito" : saveState;
  const collaborationLabel = collaborationStatusLabel(collaboration.status, collaboration.label);
  const participantCount = collaboration.participants.length;
  const showCollaborationStatus = collaboration.status !== "synced";

  return <div role="group" aria-label="Estado da sessão" className="pid-session-status">
    <span className="pid-session-status-item" data-session-state={sessionState} data-save-state={saveState}>
      <SaveIcon className={saveState === "Salvando" || collaboration.status === "connecting" ? "size-3.5 animate-spin" : "size-3.5"} aria-hidden="true" />
      <span>{saveLabel}</span>
    </span>
    {showCollaborationStatus && <span className="pid-session-status-item pid-session-status-collaboration">
      <span className="pid-session-status-dot" data-collaboration-state={collaboration.status} aria-hidden="true" />
      <span>{collaborationLabel}</span>
      {participantCount > 1 && <span className="pid-session-status-participants" title={`${participantCount} participantes`}>
        <UsersRound className="size-3.5" aria-hidden="true" />
        <span>{participantCount}</span>
      </span>}
    </span>}
    {onRetry && <Button type="button" variant="ghost" size="sm" onClick={onRetry}>Tentar salvar novamente</Button>}
  </div>;
}

function collaborationStatusLabel(status: CollaborationSnapshot["status"], label: CollaborationSnapshot["label"]): string {
  switch (status) {
    case "connecting": return "Conectando sessão";
    case "reconnecting": return "Reconectando sessão";
    case "unsaved": return "Alterações locais pendentes";
    case "synced": return `${label} sincronizada`;
  }
}
