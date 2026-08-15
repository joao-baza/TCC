import { useState } from "react";
import { Plus, X, Zap } from "lucide-react";
import { UTILITY_COLOR_PALETTE } from "../domain/utility-category";
import type { UtilityCategory } from "../domain/utility-category";
import type { PidCommand } from "../domain/command-contract";
import { addUtilityCategory, removeUtilityCategory } from "../domain/commands";

interface Props {
  categories: readonly UtilityCategory[];
  onCommand: (cmd: PidCommand) => void;
  editable: boolean;
  titleId?: string;
  onClose?: () => void;
}

export function UtilityCategoriesPanel({ categories, onCommand, editable, titleId, onClose }: Props) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState("blue");

  const handleAdd = () => {
    if (!name.trim()) return;
    onCommand(addUtilityCategory(name.trim(), selectedColor));
    setName("");
    setAdding(false);
  };

  return (
    <div className="flex min-w-[220px] flex-col gap-2 p-2">
      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-600">
        <span id={titleId} className="inline-flex min-w-0 items-center gap-2">
          <Zap className="size-3.5 shrink-0" /> <span className="truncate">Categorias de utilidade</span>
        </span>
        {onClose && (
          <button
            type="button"
            className="inline-flex size-7 shrink-0 items-center justify-center rounded hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Fechar categorias de utilidade"
            onClick={onClose}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      {categories.map(cat => (
        <div key={cat.id} className="flex items-center gap-2 text-xs">
          <span className="size-3 rounded-full shrink-0 border border-slate-300"
            style={{ backgroundColor: cat.color }} />
          <span className="flex-1 truncate">{cat.name}</span>
          {editable && (
            <button type="button" className="shrink-0 text-slate-400 hover:text-red-500"
              title="Remover categoria"
              onClick={() => onCommand(removeUtilityCategory(cat.id))}>
              <X className="size-3" />
            </button>
          )}
        </div>
      ))}
      {categories.length === 0 && !adding && (
        <p className="text-xs text-slate-400">Nenhuma categoria criada.</p>
      )}
      {editable && !adding && (
        <button type="button" className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
          onClick={() => setAdding(true)}>
          <Plus className="size-3" /> Nova categoria
        </button>
      )}
      {editable && adding && (
        <div className="flex flex-col gap-1.5 mt-1">
          <input className="h-6 rounded border border-input px-1.5 text-xs bg-white"
            placeholder="Nome da categoria" value={name}
            onChange={e => setName(e.target.value)} autoFocus
            onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }} />
          <div className="grid grid-cols-8 gap-1">
            {Object.entries(UTILITY_COLOR_PALETTE).map(([key, hex]) => (
              <button type="button" key={key}
                className={`size-4 rounded-full border-2 ${selectedColor === key ? "border-slate-800 scale-110" : "border-transparent"}`}
                style={{ backgroundColor: hex }} title={key}
                onClick={() => setSelectedColor(key)} />
            ))}
          </div>
          <div className="flex gap-1">
            <button type="button" className="h-6 rounded bg-blue-600 px-2 text-xs text-white hover:bg-blue-700"
              onClick={handleAdd}>Adicionar</button>
            <button type="button" className="h-6 rounded border px-2 text-xs hover:bg-slate-50"
              onClick={() => setAdding(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
