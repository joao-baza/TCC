import {
  Undo2, Redo2, Trash2, CopyPlus, Copy, ClipboardPaste,
  RotateCw, RotateCcw, Group, StickyNote,
  GitBranch, FileImage, ImageDown, Zap, HelpCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip, TooltipTrigger, TooltipContent,
} from "@/components/ui/tooltip";

import type { PidIconSize } from "./use-pid-settings";
import type { ConnectionClass } from "../domain/model";
import type { EditorSelectionCapabilities, EditorToolbarActions } from "./editor-toolbar-utils";

const ICON_CLASS: Record<PidIconSize, string> = {
  sm: "size-3",
  md: "size-4",
  lg: "size-5",
};

export {
  type EditorSelectionCapabilities,
  type EditorToolbarActions,
  getEditorSelectionCapabilities,
  getEditorPositionedSelectionIds,
} from "./editor-toolbar-utils";

function IconButton({ label, shortcut, disabled, pressed, onClick, iconClass, children }: {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  pressed?: boolean;
  onClick: () => void;
  iconClass: string;
  children: React.ReactNode;
}) {
  const button = <Button variant="ghost" size="icon-sm" disabled={disabled} onClick={onClick} aria-label={label} aria-pressed={pressed}>
    {children}
  </Button>;

  return <Tooltip>
    <TooltipTrigger render={disabled ? <span>{button}</span> : button}>
      {children}
    </TooltipTrigger>
    <TooltipContent>{label}{shortcut ? ` (${shortcut})` : ""}</TooltipContent>
  </Tooltip>;
}

export function EditorToolbar({ editable, capabilities, canUndo, canRedo, canPaste, canExport, exporting, exportErrors, onExportSvg, onExportPng, connectionClass, actions, signalLegendOpen = false, onToggleSignalLegend = () => {}, utilityCategoriesOpen = false, onToggleUtilityCategories = () => {}, iconSize = "md" }: {
  readonly editable: boolean;
  readonly capabilities: EditorSelectionCapabilities;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly canPaste: boolean;
  readonly canExport: boolean;
  readonly exporting: boolean;
  readonly exportErrors: readonly string[];
  readonly onExportSvg: () => void;
  readonly onExportPng: () => void;
  readonly connectionClass: ConnectionClass;
  readonly actions: EditorToolbarActions;
  readonly signalLegendOpen?: boolean;
  readonly onToggleSignalLegend?: () => void;
  readonly utilityCategoriesOpen?: boolean;
  readonly onToggleUtilityCategories?: () => void;
  readonly iconSize?: PidIconSize;
}) {
  const cls = ICON_CLASS[iconSize];

  const Separator = () => <div className="mx-0.5 h-6 w-px bg-border" />;

  return <div role="toolbar" aria-label="Ferramentas do editor P&ID" className="pid-editor-toolbar inline-flex items-center gap-0.5">
    {editable && <>
      <IconButton label="Desfazer" shortcut="Ctrl+Z" disabled={!canUndo} onClick={actions.undo} iconClass={cls}><Undo2 className={cls} /></IconButton>
      <IconButton label="Refazer" shortcut="Ctrl+Shift+Z" disabled={!canRedo} onClick={actions.redo} iconClass={cls}><Redo2 className={cls} /></IconButton>
      <Separator />
      <IconButton label="Excluir seleção" shortcut="Delete" disabled={!capabilities.canDelete} onClick={actions.deleteSelection} iconClass={cls}><Trash2 className={cls} /></IconButton>
      <IconButton label="Duplicar" shortcut="Ctrl+D" disabled={!capabilities.canDuplicate} onClick={actions.duplicate} iconClass={cls}><CopyPlus className={cls} /></IconButton>
      <IconButton label="Copiar" shortcut="Ctrl+C" disabled={!capabilities.canCopy} onClick={actions.copy} iconClass={cls}><Copy className={cls} /></IconButton>
      <IconButton label="Colar" shortcut="Ctrl+V" disabled={!canPaste} onClick={actions.paste} iconClass={cls}><ClipboardPaste className={cls} /></IconButton>
      <Separator />
      <IconButton label="Girar 90°" shortcut="Ctrl+]" disabled={!capabilities.canRotate} onClick={() => actions.rotate(90)} iconClass={cls}><RotateCw className={cls} /></IconButton>
      <IconButton label="Girar -90°" shortcut="Ctrl+[" disabled={!capabilities.canRotate} onClick={() => actions.rotate(-90)} iconClass={cls}><RotateCcw className={cls} /></IconButton>
      <Separator />
      <IconButton label="Agrupar" shortcut="Ctrl+G" disabled={!capabilities.canGroup} onClick={actions.group} iconClass={cls}><Group className={cls} /></IconButton>
      <IconButton label="Adicionar anotação" shortcut="Ctrl+Shift+A" onClick={actions.insertAnnotation} iconClass={cls}><StickyNote className={cls} /></IconButton>
      <ConnectionClassSelect connectionClass={connectionClass} actions={actions} />
      <IconButton label="Categorias de utilidade" pressed={utilityCategoriesOpen} onClick={onToggleUtilityCategories} iconClass={cls}>
        <Zap className={cls} />
      </IconButton>
    </>}
    <Separator />
    <IconButton label="Legenda de sinais" pressed={signalLegendOpen} onClick={onToggleSignalLegend} iconClass={cls}>
      <HelpCircle className={cls} />
    </IconButton>
    <Separator />
    <div role="group" aria-label="Exportação" className="inline-flex items-center gap-0.5">
      <IconButton label="Exportar SVG" disabled={!canExport || exporting} onClick={onExportSvg} iconClass={cls}><FileImage className={cls} /></IconButton>
      <IconButton label="Exportar PNG" disabled={!canExport || exporting} onClick={onExportPng} iconClass={cls}><ImageDown className={cls} /></IconButton>
    </div>
    {exporting && <span role="status">Preparando exportação…</span>}
    {exportErrors.length > 0 && <div role="group" aria-label="Erros que bloqueiam a exportação" aria-live="assertive" className="pid-export-errors"><p>Corrija os erros antes de exportar:</p><ul>{exportErrors.map((message, index) => <li key={`${index}:${message}`}>{message}</li>)}</ul></div>}
  </div>;
}

function ConnectionClassSelect({ connectionClass, actions }: { connectionClass: ConnectionClass; actions: EditorToolbarActions }) {
  return <label className="inline-flex items-center gap-1 cursor-pointer" title="Tipo de linha de conexão">
    <GitBranch className="size-4" />
    <select
      aria-label="Tipo de linha de conexão"
      value={connectionClass}
      onChange={(event) => actions.setConnectionClass(event.target.value as ConnectionClass)}
      className="h-6 rounded border border-input bg-background px-1 text-xs"
    >
      <option value="process">Processo</option>
      <option value="utility">Utilidade</option>
      <option value="signal">Sinal</option>
    </select>
  </label>;
}
