import { Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";

const removeButtonClassName =
  "border-destructive/40 bg-background text-destructive shadow-sm hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive";

export function RemoveButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      className={removeButtonClassName}
      aria-label={label}
      onClick={onClick}
    >
      <Trash2Icon className="size-4" />
    </Button>
  );
}
