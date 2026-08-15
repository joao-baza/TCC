import { RotateCcw, ZoomOut, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePidSettings, type PidIconSize, type PidTextSize } from "./use-pid-settings";
import { cn } from "@/lib/utils";

function SegmentedButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-pressed={selected} onClick={onClick} className={cn(
    "flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
    selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted hover:bg-accent",
  )}>{children}</button>;
}

export function PidSettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { settings, updateSetting, resetSettings } = usePidSettings();

  if (!open) return null;

  return <div className="pid-modal-backdrop" onClick={() => onOpenChange(false)} role="presentation">
    <div role="dialog" aria-label="Configurações do editor P&ID" aria-modal="true" className="pid-modal-card" onClick={(e) => e.stopPropagation()}>
      <header>
        <h2>Configurações do Editor</h2>
        <Button variant="ghost" size="icon-sm" aria-label="Fechar" onClick={() => onOpenChange(false)}>
          <span aria-hidden="true">&times;</span>
        </Button>
      </header>

      <label>
        <span className="block text-sm font-medium mb-1.5">Tamanho dos ícones</span>
        <div className="flex gap-1">
          {(["sm", "md", "lg"] as PidIconSize[]).map((size) => (
            <SegmentedButton key={size} selected={settings.iconSize === size} onClick={() => updateSetting("iconSize", size)}>
              {size === "sm" ? "Pequeno" : size === "md" ? "Médio" : "Grande"}
            </SegmentedButton>
          ))}
        </div>
      </label>

      <label>
        <span className="block text-sm font-medium mb-1.5">Tamanho do texto</span>
        <div className="flex gap-1">
          {(["sm", "md", "lg"] as PidTextSize[]).map((size) => (
            <SegmentedButton key={size} selected={settings.textSize === size} onClick={() => updateSetting("textSize", size)}>
              {size === "sm" ? "Pequeno" : size === "md" ? "Médio" : "Grande"}
            </SegmentedButton>
          ))}
        </div>
      </label>

      <label>
        <span className="block text-sm font-medium mb-1.5">Miniaturas do catálogo: {settings.catalogThumbSize}px</span>
        <div className="flex items-center gap-2">
          <ZoomOut className="size-4 text-muted-foreground" />
          <input type="range" min={24} max={72} value={settings.catalogThumbSize} onChange={(e) => updateSetting("catalogThumbSize", Number(e.target.value))} className="flex-1 accent-primary" />
          <ZoomIn className="size-4 text-muted-foreground" />
        </div>
      </label>

      <div className="flex justify-end pt-2">
        <Button variant="outline" size="sm" onClick={resetSettings}>
          <RotateCcw className="size-3.5" />
          Restaurar padrão
        </Button>
      </div>
    </div>
  </div>;
}
