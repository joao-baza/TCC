import type { HTMLAttributes } from "react";
import { NavLink } from "react-router-dom";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { moduleRoutes } from "@/lib/routes";

const groupedRoutes = moduleRoutes.reduce<
  Array<{ group: string; items: Array<(typeof moduleRoutes)[number]> }>
>((acc, route) => {
  const bucket = acc.find((entry) => entry.group === route.group);

  if (bucket) {
    bucket.items.push(route);
    return acc;
  }

  acc.push({ group: route.group, items: [route] });
  return acc;
}, []);

export function AppSidebar({
  className,
}: HTMLAttributes<HTMLElement>) {
  return (
    <aside
      className={cn(
        "border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        className,
      )}
    >
      <div className="border-b px-6 py-5">
        <div className="flex items-center gap-3">
          <img
            alt="Universidade Federal de Mato Grosso do Sul"
            className="h-11 w-11 shrink-0 rounded-xl object-contain"
            src="/UFMS.png"
          />
          <div className="min-w-0">
            <p className="text-lg font-semibold leading-tight">DCOU</p>
            <p className="text-sm font-medium text-foreground/80 leading-tight">
              Dimensionamento Computacional de Operações Unitárias
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Engenharia Química - UFMS
            </p>
          </div>
        </div>
      </div>
      <ScrollArea className="h-[calc(100vh-89px)]">
        <nav aria-label="Navegação principal" className="space-y-6 px-4 py-6">
          {groupedRoutes.map(({ group, items }) => (
            <div key={group} className="space-y-2">
              {group !== "root" ? (
                <p className="px-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {group}
                </p>
              ) : null}
              <div className="flex flex-col gap-1">
                {items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/"}
                    className={({ isActive }) =>
                      cn(
                        "rounded-lg px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-foreground hover:bg-accent hover:text-accent-foreground",
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );
}
