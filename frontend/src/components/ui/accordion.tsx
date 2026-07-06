import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Accordion as BaseAccordion } from "@base-ui/react/accordion";

import { cn } from "@/lib/utils";

function Accordion({
  className,
  ...props
}: React.ComponentProps<typeof BaseAccordion.Root>) {
  return <BaseAccordion.Root className={cn("w-full", className)} {...props} />;
}

const AccordionItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof BaseAccordion.Item>
>(({ className, ...props }, ref) => (
  <BaseAccordion.Item ref={ref} className={cn("border-b border-border", className)} {...props} />
));
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<
  HTMLElement,
  React.ComponentProps<typeof BaseAccordion.Trigger>
>(({ className, children, ...props }, ref) => (
  <BaseAccordion.Header className="flex">
    <BaseAccordion.Trigger
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between gap-3 py-3 text-left text-sm font-medium transition hover:text-foreground",
        className,
      )}
      {...props}
    >
      <span>{children}</span>
      <ChevronDown className="size-4 shrink-0 transition data-[panel-open]:rotate-180" />
    </BaseAccordion.Trigger>
  </BaseAccordion.Header>
));
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof BaseAccordion.Panel>
>(({ className, ...props }, ref) => (
  <BaseAccordion.Panel
    ref={ref}
    className={cn("overflow-hidden pb-4 text-sm text-muted-foreground", className)}
    {...props}
  />
));
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
