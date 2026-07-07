import type { ReactNode } from "react";
import { NavLink, useMatch, useResolvedPath } from "react-router-dom";

import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ModuleTab = {
  to: string;
  label: string;
};

type ModuleTabsLayoutProps = {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  tabs: ReadonlyArray<ModuleTab>;
  children: ReactNode;
};

function ModuleTabLink({ to, label }: ModuleTab) {
  const resolvedPath = useResolvedPath(to);
  const isActive = useMatch({ path: resolvedPath.pathname, end: true });

  return (
    <NavLink
      role="tab"
      aria-selected={Boolean(isActive)}
      aria-current={isActive ? "page" : undefined}
      to={to}
      end
      className={({ isActive: linkIsActive }) =>
        cn(
          "whitespace-nowrap rounded-t-xl border-b-2 px-4 py-2 text-sm font-medium transition",
          linkIsActive
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground",
        )
      }
    >
      {label}
    </NavLink>
  );
}

export function ModuleTabsLayout({
  title,
  subtitle,
  action,
  tabs,
  children,
}: ModuleTabsLayoutProps) {
  return (
    <section className="space-y-6 p-6 md:p-8">
      <Card>
        <CardHeader level={1} subtitle={subtitle} title={title} variant="hero" action={action} />
      </Card>

      <div className="rounded-2xl border border-border bg-card px-3 pt-3 shadow-sm">
        <div role="tablist" aria-label={title} className="flex w-full gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <ModuleTabLink key={tab.to} to={tab.to} label={tab.label} />
          ))}
        </div>
      </div>

      <div role="tabpanel" className="min-w-0">
        {children}
      </div>
    </section>
  );
}
