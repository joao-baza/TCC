import type { PropsWithChildren } from "react";
import {
  resolveProductSection,
  resolveSimulationModule,
  shellNavigation
} from "@/features/shell/module-registry";

type AppShellProps = PropsWithChildren<{
  currentSection?: string;
  currentTab?: string;
  onNavigate?: (tabId: string) => void;
}>;

export function AppShell({
  children,
  currentSection,
  currentTab,
  onNavigate
}: AppShellProps) {
  const activeSection = resolveProductSection(currentSection ?? currentTab);
  const activeModule = resolveSimulationModule(currentTab);

  const simulationGroups = shellNavigation.simulations.reduce<
    Array<{ label: string; items: (typeof shellNavigation.simulations)[number][] }>
  >((groups, item) => {
    const existingGroup = groups.find((group) => group.label === item.group);

    if (existingGroup) {
      existingGroup.items.push(item);
      return groups;
    }

    groups.push({ label: item.group, items: [item] });
    return groups;
  }, []);

  return (
    <div className="app-layout">
      <aside
        aria-label="Navegação principal"
        className="sidebar"
        id="sidebar"
        role="navigation"
      >
        <div className="sidebar-header">
          <div className="sidebar-title">DCOU</div>
          <div className="sidebar-subtitle">Engenharia Química — UFMS</div>
        </div>
        <nav aria-label="Menu principal" className="sidebar-nav">
          <div className="nav-group">
            {shellNavigation.topLevel.map((item) => {
              const isCurrent = activeSection === item.id;

              return (
                <a
                  aria-current={isCurrent ? "page" : undefined}
                  className={`nav-item${isCurrent ? " active" : ""}`}
                  href={item.href}
                  key={item.id}
                  onClick={(event) => {
                    if (!onNavigate) {
                      return;
                    }

                    event.preventDefault();
                    onNavigate?.(item.id);
                  }}
                >
                  {item.label}
                </a>
              );
            })}
          </div>

          {simulationGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <div className="nav-group-label">{group.label}</div>
              {group.items.map((item) => {
                const isCurrent = activeSection === "simulations" && activeModule === item.id;

                return (
                  <a
                    aria-current={isCurrent ? "page" : undefined}
                    className={`nav-item${isCurrent ? " active" : ""}`}
                    href={item.href}
                    key={item.id}
                    onClick={(event) => {
                      if (!onNavigate) {
                        return;
                      }

                      event.preventDefault();
                      onNavigate?.(item.id);
                    }}
                  >
                    {item.label}
                  </a>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      <main className="main-content" id="mainContent">
        <div className="tab-content">{children}</div>
      </main>
    </div>
  );
}
