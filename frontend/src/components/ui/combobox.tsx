import { useEffect, useId, useMemo, useState } from "react";

import { Combobox as BaseCombobox } from "@base-ui/react/combobox";

import { cn } from "@/lib/utils";

export type ComboboxOption = {
  value: string;
  label: string;
};

type ComboboxProps = {
  label: string;
  options: ComboboxOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
};

export function Combobox({
  label,
  options,
  value,
  onValueChange,
  placeholder = "Selecione uma opção",
  emptyText = "Nenhuma opção encontrada",
  disabled = false,
  className,
}: ComboboxProps) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );
  const [searchValue, setSearchValue] = useState("");

  const visibleOptions = useMemo(() => {
    const normalizedQuery = searchValue.trim().toLowerCase();
    if (!normalizedQuery) {
      return options;
    }

    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(normalizedQuery) ||
        option.value.toLowerCase().includes(normalizedQuery),
    );
  }, [options, searchValue]);

  useEffect(() => {
    const normalizedQuery = searchValue.trim();
    if (!normalizedQuery || visibleOptions.length !== 1) {
      return;
    }

    const [nextOption] = visibleOptions;
    if (!nextOption || nextOption.value === value) {
      return;
    }

    onValueChange(nextOption.value);
    setSearchValue("");
    setOpen(false);
  }, [onValueChange, searchValue, value, visibleOptions]);

  return (
    <div className={cn("space-y-2", className)}>
      <label className="block text-sm font-medium text-foreground" htmlFor={inputId}>
        {label}
      </label>

      <BaseCombobox.Root
        items={options}
        filteredItems={visibleOptions}
        value={selectedOption}
        open={open}
        autoHighlight
        disabled={disabled}
        onOpenChange={setOpen}
        onInputValueChange={(nextQuery, eventDetails) => {
          setSearchValue(nextQuery);

          if (eventDetails.reason === "input-change" || eventDetails.reason === "input-clear") {
            setOpen(true);
          }
        }}
        onValueChange={(nextOption) => {
          onValueChange(nextOption?.value ?? "");
          setOpen(false);
          setSearchValue("");
        }}
      >
        <BaseCombobox.Input
          id={inputId}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition",
            "focus:border-primary focus:ring-2 focus:ring-primary/20",
            "disabled:cursor-not-allowed disabled:bg-muted/40",
          )}
          onFocus={(event) => {
            setOpen(true);
            event.currentTarget.value = "";
            event.currentTarget.dispatchEvent(new Event("input", { bubbles: true }));
            // Clear the search text so reopening shows the full option list.
            setSearchValue("");
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || !open || !visibleOptions.length) {
              return;
            }

            event.preventDefault();
            onValueChange(visibleOptions[0].value);
            setSearchValue("");
            setOpen(false);
          }}
        />
        <BaseCombobox.Portal>
          <BaseCombobox.Positioner className="z-20 w-[var(--anchor-width)]">
            <BaseCombobox.Popup className="mt-2 overflow-hidden rounded-xl shadow-sm">
              <BaseCombobox.List className="max-h-64 overflow-auto rounded-xl border border-border bg-background">
                {visibleOptions.length ? (
                  visibleOptions.map((option, index) => (
                    <BaseCombobox.Item
                      key={option.value}
                      index={index}
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
