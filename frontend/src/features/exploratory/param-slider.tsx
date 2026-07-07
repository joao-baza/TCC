import { Slider } from "@/components/ui/slider";
import type { SliderConfig } from "@/features/exploratory/types";

function withUnit(value: number, unit: string) {
  return unit ? `${value} ${unit}` : String(value);
}

export function ParamSlider({
  config,
  value,
  onChange,
}: {
  config: SliderConfig;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
      <div className="mb-2 flex items-center justify-between gap-2 text-sm font-semibold text-slate-800">
        <span>{config.label}</span>
        <span className="font-mono text-blue-600">{withUnit(value, config.unit)}</span>
      </div>
      <Slider
        aria-label={config.label}
        min={config.min}
        max={config.max}
        step={config.step}
        value={[value]}
        onValueChange={(next) => onChange(next[0])}
      />
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{withUnit(config.min, config.unit)}</span>
        <span>{withUnit(config.max, config.unit)}</span>
      </div>
    </div>
  );
}
