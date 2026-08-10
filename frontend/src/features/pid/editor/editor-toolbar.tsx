import {
  Undo2, Redo2, Trash2, CopyPlus, Copy, ClipboardPaste,
  RotateCw, RotateCcw, AlignJustify, Group, StickyNote,
  GitBranch, Maximize2, ZoomIn, ZoomOut, FileImage, ImageDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip, TooltipTrigger, TooltipContent,
} from "@/components/ui/tooltip";

import type { PidIconSize } from "./use-pid-settings";
import type { ConnectionClass } from "../domain/model";
import type { EditorToolbarActions } from "./editor-toolbar-utils";

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

export function EditorToolbar({ editable, capabilities, canUndo, canRedo, canPaste, canExport, exporting, exportErrors, exportBackground, onExportBackgroundChange, onExportSvg, onExportPng, connectionClass, actions, iconSize = "md" }: {
  readonly editable: boolean;
  readonly capabilities: EditorToolbarActions extends infer _ ? import("./editor-toolbar-utils").EditorSelectionCapabilities : never;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly canPaste: boolean;
  readonly canExport: boolean;
  readonly exporting: boolean;
  readonly exportErrors: readonly string[];
  readonly exportBackground: "white" | "transparent";
  readonly onExportBackgroundChange: (value: "white" | "transparent") => void;
  readonly onExportSvg: () => void;
  readonly onExportPng: () => void;
  readonly connectionClass: ConnectionClass;
  readonly actions: EditorToolbarActions;
  readonly iconSize?: PidIconSize;
}) {
  const cls = ICON_CLASS[iconSize];

  const Separator = () => <div className="mx-0.5 h-6 w-px bg-border" />;

  return <div role="toolbar" aria-label="Ferramentas do editor P&ID" className="pid-editor-toolbar inline-flex items-center gap-0.5">
    {editable && <>
      <Tooltip>
        <TooltipTrigger render={<Button variant="ghost" size="icon-sm" disabled={!canUndo} onClick={actions.undo} aria-label="Desfazer" />}>
          <Undo2 className={cls} />
        </TooltipTrigger>
        <TooltipContent>Desfazer</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={<Button variant="ghost" size="icon-sm" disabled={!canRedo} onClick={actions.redo} aria-label="Refazer" />}>
          <Redo2 className={cls} />
        </TooltipTrigger>
        <TooltipContent>Refazer</TooltipContent>
      </Tooltip>
      <Separator />
      <Tooltip>
        <TooltipTrigger render={<Button variant="ghost" size="icon-sm" disabled={!capabilities.canDelete} onClick={actions.deleteSelection} aria-label="Excluir seleção" />}>
          <Trash2 className={cls} />
        </TooltipTrigger>
        <TooltipContent>Excluir seleção</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={<Button variant="ghost" size="icon-sm" disabled={!capabilities.canDuplicate} onClick={actions.duplicate} aria-label="Duplicar" />}>
          <CopyPlus className={cls} />
        </TooltipTrigger>
        <TooltipContent>Duplicar</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={<Button variant="ghost" size="icon-sm" disabled={!capabilities.canCopy} onClick={actions.copy} aria-label="Copiar" />}>
          <Copy className={cls} />
        </TooltipTrigger>
        <TooltipContent>Copiar</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={<Button variant="ghost" size="icon-sm" disabled={!canPaste} onClick={actions.paste} aria-label="Colar" />}>
          <ClipboardPaste className={cls} />
        </TooltipTrigger>
        <TooltipContent>Colar</TooltipContent>
      </Tooltip>
      <Separator />
      <Tooltip>
        <TooltipTrigger render={<Button variant="ghost" size="icon-sm" disabled={!capabilities.canRotate} onClick={() => actions.rotate(90)} aria-label="Girar 90°" />}>
          <RotateCw className={cls} />
        </TooltipTrigger>
        <TooltipContent>Girar 90°</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={<Button variant="ghost" size="icon-sm" disabled={!capabilities.canRotate} onClick={() => actions.rotate(-90)} aria-label="Girar -90°" />}>
          <RotateCcw className={cls} />
        </TooltipTrigger>
        <TooltipContent>Girar -90°</TooltipContent>
      </Tooltip>
      <AlignedSelect capabilities={capabilities} actions={actions} cls={cls} />
      <Separator />
      <Tooltip>
        <TooltipTrigger render={<Button variant="ghost" size="icon-sm" disabled={!capabilities.canGroup} onClick={actions.group} aria-label="Agrupar" />}>
          <Group className={cls} />
        </TooltipTrigger>
        <TooltipContent>Agrupar</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={<Button variant="ghost" size="icon-sm" onClick={actions.insertAnnotation} aria-label="Adicionar anotação" />}>
          <StickyNote className={cls} />
        </TooltipTrigger>
        <TooltipContent>Adicionar anotação</TooltipContent>
      </Tooltip>
      <ConnectionClassSelect connectionClass={connectionClass} actions={actions} />
    </>}
    <Separator />
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost" size="icon-sm" onClick={actions.fit} aria-label="Ajustar diagrama à tela" />}>
        <Maximize2 className={cls} />
      </TooltipTrigger>
      <TooltipContent>Ajustar diagrama à tela</TooltipContent>
    </Tooltip>
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost" size="icon-sm" onClick={actions.zoomIn} aria-label="Aumentar zoom" />}>
        <ZoomIn className={cls} />
      </TooltipTrigger>
      <TooltipContent>Aumentar zoom</TooltipContent>
    </Tooltip>
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost" size="icon-sm" onClick={actions.zoomOut} aria-label="Diminuir zoom" />}>
        <ZoomOut className={cls} />
      </TooltipTrigger>
      <TooltipContent>Diminuir zoom</TooltipContent>
    </Tooltip>
    <Separator />
    <div role="group" aria-label="Exportação" className="inline-flex items-center gap-0.5">
      <label className="inline-flex items-center gap-1 cursor-pointer">
        <FileImage className={cls} />
        <select
          aria-label="Fundo da exportação"
          value={exportBackground}
          disabled={exporting}
          onChange={(event) => onExportBackgroundChange(event.target.value as "white" | "transparent")}
          className="h-6 rounded border border-input bg-background px-1 text-xs"
        >
          <option value="white">Branco</option>
          <option value="transparent">Transparente</option>
        </select>
      </label>
      <Tooltip>
        <TooltipTrigger render={<Button variant="ghost" size="icon-sm" disabled={!canExport || exporting} onClick={onExportSvg} aria-label="Exportar SVG" />}>
          <FileImage className={cls} />
        </TooltipTrigger>
        <TooltipContent>Exportar SVG</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={<Button variant="ghost" size="icon-sm" disabled={!canExport || exporting} onClick={onExportPng} aria-label="Exportar PNG" />}>
          <ImageDown className={cls} />
        </TooltipTrigger>
        <TooltipContent>Exportar PNG</TooltipContent>
      </Tooltip>
    </div>
    {exporting && <span role="status">Preparando exportação…</span>}
    {exportErrors.length > 0 && <div role="group" aria-label="Erros que bloqueiam a exportação" aria-live="assertive" className="pid-export-errors"><p>Corrija os erros antes de exportar:</p><ul>{exportErrors.map((message, index) => <li key={`${index}:${message}`}>{message}</li>)}</ul></div>}
  </div>;
}

function AlignedSelect({ capabilities, actions, cls }: { capabilities: { canAlign: boolean }; actions: EditorToolbarActions; cls: string }) {
  return <label className="inline-flex items-center gap-1 cursor-pointer" title={capabilities.canAlign ? "Alinhar seleção" : undefined}>
    <AlignJustify className={cls} />
    <select
      aria-label="Alinhar seleção"
      disabled={!capabilities.canAlign}
      defaultValue=""
      onChange={(event) => { if (event.target.value) actions.align(event.target.value as Parameters<EditorToolbarActions["align"]>[0]); event.target.value = ""; }}
      className="h-6 rounded border border-input bg-background px-1 text-xs"
    >
      <option value="">Alinhar…</option>
      <option value="left">Esquerda</option>
      <option value="center-x">Centro horizontal</option>
      <option value="right">Direita</option>
      <option value="top">Topo</option>
      <option value="center-y">Centro vertical</option>
      <option value="bottom">Base</option>
    </select>
  </label>;
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
