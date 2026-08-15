import { ZoomIn, ZoomOut } from "lucide-react";

export function CatalogZoomSlider({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <div className="flex items-center gap-2 px-1">
    <ZoomOut className="size-3.5 text-muted-foreground" />
    <input type="range" min={24} max={72} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1 accent-primary h-1" aria-label="Tamanho das miniaturas" />
    <ZoomIn className="size-3.5 text-muted-foreground" />
  </div>;
}
