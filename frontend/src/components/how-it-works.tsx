import type { ReactNode } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function HowItWorks({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Accordion defaultValue={[]} className="w-full">
      <AccordionItem value={title}>
        <AccordionTrigger className="text-sm font-medium">
          {title}
        </AccordionTrigger>
        <AccordionContent className="space-y-2">{children}</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export function TheoryRef({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-xs italic text-muted-foreground">{children}</p>;
}
