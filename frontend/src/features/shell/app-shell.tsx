import type { PropsWithChildren } from "react";
import { BookOpenText, Gauge, Workflow } from "lucide-react";
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

  const activeSectionLabel =
    shellNavigation.topLevel.find((item) => item.id === activeSection)?.label ?? "Início";

  return (
    <div className="app-shell-backdrop">
      <span className="app-shell-orb app-shell-orb--one" aria-hidden="true" />
      <span className="app-shell-orb app-shell-orb--two" aria-hidden="true" />
      <span className="app-shell-grid" aria-hidden="true" />

      <div className="app-layout">
        <aside
          aria-label="Navegação principal"
          className="sidebar"
          id="sidebar"
          role="navigation"
        >
          <div className="sidebar-header">
            <div className="sidebar-title">DCOU</div>
            <div className="sidebar-subtitle">Engenharia Química · UFMS</div>
            <p className="sidebar-copy">
              Um laboratório digital para entender, calcular e ensinar operações unitárias.
            </p>
          </div>

          <div className="sidebar-metrics">
            <div className="sidebar-metric">
              <Gauge aria-hidden="true" size={15} />
              <span>{shellNavigation.simulations.length} módulos</span>
            </div>
            <div className="sidebar-metric">
              <Workflow aria-hidden="true" size={15} />
              <span>Fluxos guiados</span>
            </div>
            <div className="sidebar-metric">
              <BookOpenText aria-hidden="true" size={15} />
              <span>Uso em aula e estudo</span>
            </div>
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
                      onNavigate(item.id);
                    }}
                    >
                      <span>{item.label}</span>
                    {item.id === activeSection ? (
                      <span aria-hidden="true" className="nav-item-chip">
                        Atual
                      </span>
                    ) : null}
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
                        onNavigate(item.id);
                      }}
                    >
                      <span>{item.label}</span>
                      <span aria-hidden="true" className="nav-item-chip">
                        {item.group}
                      </span>
                    </a>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>

        <main className="main-content" id="mainContent">
          <header className="content-topbar">
            <div>
              <p className="eyebrow">Área ativa</p>
              <h1>{activeSectionLabel}</h1>
            </div>
            <div className="content-topbar__note">
              Use a navegação lateral para alternar entre simulações, trilhas e recursos didáticos.
            </div>
          </header>

          <div className="tab-content">{children}</div>
        </main>
      </div>
    </div>
  );
}
