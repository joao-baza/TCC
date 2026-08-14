import { useEffect, useRef, type ReactNode } from "react";
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface PidDockRailProps {
  readonly side: "left" | "right";
  readonly label: string;
  readonly openLabel: string;
  readonly closeLabel: string;
  readonly open: boolean;
  readonly onToggle: () => void;
  readonly children: ReactNode;
}

export function PidDockRail({ side, label, openLabel, closeLabel, open, onToggle, children }: PidDockRailProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const previousOpen = useRef(open);

  useEffect(() => {
    if (previousOpen.current === open) return;
    if (open) {
      const firstControl = contentRef.current?.querySelector<HTMLElement>("input, button, select, textarea, [tabindex]:not([tabindex=\"-1\"])");
      firstControl?.focus();
    } else {
      toggleRef.current?.focus();
    }
    previousOpen.current = open;
  }, [open]);

  const Icon = open
    ? side === "left" ? PanelLeftClose : PanelRightClose
    : side === "left" ? PanelLeftOpen : PanelRightOpen;
  const actionLabel = open ? closeLabel : openLabel;

  return <aside
    role="region"
    aria-label={label}
    data-dock-state={open ? "open" : "closed"}
    className={cn("pid-studio-panel pid-dock-rail", open ? "pid-dock-rail-open" : "pid-dock-rail-closed", `pid-dock-rail-${side}`)}
  >
    {open ? <div className="pid-dock-open-content" ref={contentRef}>
      <div className="pid-dock-heading">
        <span className="pid-dock-title">{label}</span>
        <DockToggleButton ref={toggleRef} label={actionLabel} shortcut={side === "left" ? "C" : "I"} expanded={open} onClick={onToggle} icon={Icon} />
      </div>
      <div className="pid-dock-content">{children}</div>
    </div> : <div className="pid-dock-closed-content">
      <DockToggleButton ref={toggleRef} label={actionLabel} shortcut={side === "left" ? "C" : "I"} expanded={open} onClick={onToggle} icon={Icon} />
    </div>}
  </aside>;
}

function DockToggleButton({ label, shortcut, expanded, onClick, icon: Icon, ref }: {
  readonly label: string;
  readonly shortcut: string;
  readonly expanded: boolean;
  readonly onClick: () => void;
  readonly icon: typeof PanelLeftOpen;
  readonly ref: React.Ref<HTMLButtonElement>;
}) {
  return <Tooltip>
    <TooltipTrigger render={
      <Button ref={ref} variant="ghost" size="icon-sm" aria-label={label} aria-expanded={expanded} aria-keyshortcuts={shortcut} onClick={onClick}>
        <Icon className="size-4" aria-hidden="true" />
      </Button>
    } />
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>;
}
