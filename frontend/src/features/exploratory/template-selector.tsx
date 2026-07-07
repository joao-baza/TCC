import { Combobox } from "@/components/ui/combobox";

import type { TemplateConfig } from "@/features/exploratory/types";

export function TemplateSelector({
  templates,
  activeKey,
  onSelect,
}: {
  templates: TemplateConfig[];
  activeKey: string | null;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Combobox
        label="Modo Exploratório"
        options={templates.map((template) => ({
          value: template.key,
          label: template.name,
        }))}
        value={activeKey ?? ""}
        onValueChange={(value) => {
          if (value) {
            onSelect(value);
          }
        }}
        placeholder="Selecione um template didático"
        className="min-w-0 flex-1 sm:min-w-[220px]"
      />
    </div>
  );
}
