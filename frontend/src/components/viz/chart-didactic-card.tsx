import type { ReactNode } from "react";

type ChartDidacticCardProps = {
  title: string;
  subtitle?: string | null;
  howItWorks?: ReactNode;
  children: ReactNode;
};

export function ChartDidacticCard({
  title,
  subtitle,
  howItWorks,
  children,
}: ChartDidacticCardProps) {
  return (
    <section className="mx-auto w-full max-w-[760px] space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
      </div>
      {howItWorks}
      {children}
    </section>
  );
}
