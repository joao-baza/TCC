import type { ReactNode } from "react";

export function ChartPanel({
  title,
  subtitle,
  notice,
  footer,
  className,
  children,
}: {
  title: string;
  subtitle?: string | null;
  notice?: string | null;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={className ? `${className} rounded-2xl border border-border bg-background p-4 shadow-sm` : "rounded-2xl border border-border bg-background p-4 shadow-sm"}>
      <div className="space-y-1">
        <h3 className="text-base font-semibold">{title}</h3>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        {notice ? (
          <p className="text-xs font-medium text-amber-700" role="note">
          {notice}
        </p>
      ) : null}
      </div>
      <div className="mt-4 min-h-80">{children}</div>
      {footer ? <div className="mt-4">{footer}</div> : null}
    </section>
  );
}
