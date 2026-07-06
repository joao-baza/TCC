import { useId, useMemo, useState } from "react";

import { Combobox as BaseCombobox } from "@base-ui/react/combobox";

import { cn } from "@/lib/utils";

export type MultiComboboxOption = {
  value: string;
  label: string;
};

type MultiComboboxProps = {
  label: string;
  options: MultiComboboxOption[];
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
};

export function MultiCombobox({
  label,
  options,
  value,
  onValueChange,
  placeholder = "Selecione opções",
  emptyText = "Nenhuma opção encontrada",
  disabled = false,
  className,
}: MultiComboboxProps) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedValues = useMemo(() => new Set(value), [value]);
  const selectedOptions = useMemo(
    () => value.map((selectedValue) => options.find((option) => option.value === selectedValue)).filter((option): option is MultiComboboxOption => option !== undefined),
    [options, value],
  );

  const visibleOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return options.filter((option) => {
      if (selectedValues.has(option.value)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return (
        option.label.toLowerCase().includes(normalizedQuery) ||
        option.value.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [options, query, selectedValues]);

  return (
    <div className={cn("space-y-2", className)}>
      <label className="block text-sm font-medium text-foreground" htmlFor={inputId}>
        {label}
      </label>

      <BaseCombobox.Root
        multiple
        items={options}
        filteredItems={visibleOptions}
        value={selectedOptions}
        inputValue={query}
        open={open}
        autoHighlight
        disabled={disabled}
        onOpenChange={setOpen}
        onInputValueChange={setQuery}
        onValueChange={(nextOptions) => {
          onValueChange(nextOptions.map((option) => option.value));
          setQuery("");
        }}
      >
        <BaseCombobox.InputGroup
          className={cn(
            "flex min-h-11 w-full flex-wrap items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition",
            "focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
            "disabled:cursor-not-allowed disabled:bg-muted/40",
          )}
          onMouseDown={() => {
            setOpen(true);
          }}
        >
          <BaseCombobox.Chips className="flex flex-wrap gap-2">
            {selectedOptions.map((option) => (
              <BaseCombobox.Chip
                key={option.value}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-1 text-xs text-foreground"
              >
                <span>{option.label}</span>
                <BaseCombobox.ChipRemove
                  aria-label={`Remover ${option.label}`}
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition hover:bg-background hover:text-foreground"
                >
                  ×
                </BaseCombobox.ChipRemove>
              </BaseCombobox.Chip>
            ))}
          </BaseCombobox.Chips>

          <BaseCombobox.Input
            id={inputId}
            placeholder={placeholder}
            disabled={disabled}
            className="min-w-[8rem] flex-1 border-0 bg-transparent px-0 py-0 text-sm outline-none placeholder:text-muted-foreground"
            onFocus={() => {
              setOpen(true);
            }}
          />
        </BaseCombobox.InputGroup>

        <BaseCombobox.Portal>
          <BaseCombobox.Positioner className="z-20 w-[var(--anchor-width)]">
            <BaseCombobox.Popup className="mt-2 overflow-hidden rounded-xl shadow-sm">
              <BaseCombobox.List className="max-h-64 overflow-auto rounded-xl border border-border bg-background">
                {visibleOptions.length ? (
                  visibleOptions.map((option) => (
                    <BaseCombobox.Item
                      key={option.value}
                      value={option}
                      className={cn(
                        "block w-full cursor-pointer px-3 py-2 text-left text-sm transition hover:bg-muted data-[highlighted]:bg-muted data-[selected]:font-medium",
                      )}
                    >
                      {option.label}
                    </BaseCombobox.Item>
                  ))
                ) : (
                  <BaseCombobox.Empty className="px-3 py-2 text-sm text-muted-foreground">
                    {emptyText}
                  </BaseCombobox.Empty>
                )}
              </BaseCombobox.List>
            </BaseCombobox.Popup>
          </BaseCombobox.Positioner>
        </BaseCombobox.Portal>
      </BaseCombobox.Root>
    </div>
  );
}
