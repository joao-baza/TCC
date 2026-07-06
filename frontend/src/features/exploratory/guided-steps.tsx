import { useState } from "react";

import { cn } from "@/lib/utils";

function StepCard({ index, text }: { index: number; text: string }) {
  const [open, setOpen] = useState(true);
  const number = index + 1;

  return (
    <div
      className={cn(
        "mb-2 overflow-hidden rounded-2xl border bg-card/90 shadow-sm transition duration-200",
        open
          ? "border-primary/25 bg-primary/[0.04]"
          : "border-border hover:border-primary/30 hover:bg-primary/[0.03]",
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-inset"
      >
        <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {number}
        </span>
        <span className="text-sm font-medium text-foreground">Passo {number}</span>
        <span className="ml-auto text-primary/70">{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <p className="px-4 pb-4 pl-14 text-sm leading-relaxed text-foreground">{text}</p>
      ) : null}
    </div>
  );
}

export function GuidedSteps({
  steps,
  activity,
}: {
  steps: string[];
  activity: string;
}) {
  return (
    <div className="mt-4">
      <div className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-primary">
        Roteiro de exploração
      </div>
      {steps.map((text, index) => (
        <StepCard key={index} index={index} text={text} />
      ))}

      <div className="mb-2 mt-3 text-xs font-bold uppercase tracking-[0.08em] text-primary">
        Atividade
      </div>
      <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3">
        <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">
          ?
        </span>
        <p className="text-sm leading-relaxed text-slate-800">{activity}</p>
      </div>
    </div>
  );
}
