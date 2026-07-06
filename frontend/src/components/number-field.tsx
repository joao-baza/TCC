import { useState } from "react";

import { cn } from "@/lib/utils";
import { validateNumber, type ValidationRule } from "@/lib/validation";

type NumberFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rule?: ValidationRule;
  unit?: string;
  placeholder?: string;
  required?: boolean;
  step?: string;
  min?: string;
  max?: string;
};

export function NumberField({
  id,
  label,
  value,
  onChange,
  rule = "positive",
  unit,
  placeholder,
  required,
  step = "any",
  min = "0",
  max,
}: NumberFieldProps) {
  const [error, setError] = useState<string | null>(null);
  const errorId = `err-${id}`;

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-foreground" htmlFor={id}>
        {label}
        {unit ? <span className="ml-1 text-muted-foreground">({unit})</span> : null}
      </label>
      <input
        id={id}
        type="number"
        step={step}
        min={min}
        max={max}
        required={required}
        value={value}
        placeholder={placeholder}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? errorId : undefined}
        onFocus={() => setError(null)}
        onChange={(event) => {
          setError(null);
          onChange(event.target.value);
        }}
        onBlur={(event) => {
          setError(validateNumber(rule, event.target.value, label));
        }}
        className={cn(
          "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition",
          "focus:border-primary focus:ring-2 focus:ring-primary/20",
          error ? "border-destructive" : null,
        )}
      />
      {error ? (
        <p id={errorId} role="alert" aria-live="polite" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
