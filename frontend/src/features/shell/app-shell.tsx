import type { PropsWithChildren } from "react";
import { shellNavigation } from "@/features/shell/navigation";

type AppShellProps = PropsWithChildren<{
  currentSection?: string;
  currentTab?: string;
  onNavigateSection?: (sectionId: string) => void;
  onNavigate?: (tabId: string) => void;
}>;

function normalizeSection(sectionId?: string) {
  if (!sectionId) {
    return "home";
  }

  if (sectionId === "home-content") {
    return "home";
  }

  if (
    sectionId === "piping-content" ||
    sectionId === "sizing-content" ||
    sectionId === "flow-content" ||
    sectionId === "glossary-content" ||
    sectionId === "piping" ||
    sectionId === "sizing" ||
    sectionId === "flow" ||
    sectionId === "glossary"
  ) {
    return "simulations";
  }

  return sectionId;
}

function normalizeModule(tabId?: string) {
  if (
    tabId === "piping-content" ||
    tabId === "piping"
  ) {
    return "piping";
  }

  if (
    tabId === "sizing-content" ||
    tabId === "sizing"
  ) {
    return "sizing";
  }

  if (
    tabId === "flow-content" ||
    tabId === "flow"
  ) {
    return "flow";
  }

  if (
    tabId === "glossary-content" ||
    tabId === "glossary"
  ) {
    return "glossary";
  }

  return undefined;
}

export function AppShell({
  children,
  currentSection,
  currentTab,
  onNavigateSection,
  onNavigate
}: AppShellProps) {
  const activeSection = normalizeSection(currentSection ?? currentTab);
  const activeModule = normalizeModule(currentTab);

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
                  href={`#${item.id}`}
                  key={item.id}
                  onClick={(event) => {
                    if (!onNavigateSection && !onNavigate) {
                      return;
                    }

                    event.preventDefault();
                    onNavigateSection?.(item.id);
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
                    href={`#${item.id}`}
                    key={item.id}
                    onClick={(event) => {
                      if (!onNavigateSection && !onNavigate) {
                        return;
                      }

                      event.preventDefault();
                      onNavigateSection?.(item.id);
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
