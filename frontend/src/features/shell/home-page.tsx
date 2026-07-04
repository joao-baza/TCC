import { AppShell } from "@/features/shell/app-shell";
import { learningTrails, quickAccessModules } from "@/features/shell/navigation";

export function HomePage({
  onNavigate
}: {
  onNavigate?: (tabId: string) => void;
}) {
  return (
    <AppShell onNavigate={onNavigate}>
      <div className="tab-pane active" id="home-content">
        <div className="home-hero">
          <h1>DCOU - Dimensionamento Computacional de Operações Unitárias</h1>
          <p>
            Selecione um módulo na barra lateral, siga uma trilha de aprendizagem
            ou explore diretamente pelo acesso rápido.
          </p>
        </div>

        <section className="home-section">
          <div className="home-section-title">Trilhas de Aprendizagem</div>
          <div className="trail-grid">
            {learningTrails.map((trail) => (
              <a className="trail-card" href="#" key={trail.title}>
                <div className="trail-badge">{trail.badge}</div>
                <div>
                  <div className="trail-title">{trail.title}</div>
                  <div className="trail-desc">{trail.description}</div>
                </div>
              </a>
            ))}
          </div>
        </section>

        <section className="home-section">
          <div className="home-section-title">Acesso Rápido</div>
          <div className="module-grid">
            {quickAccessModules.map((module) => (
              <button
                className="module-card"
                disabled={!("target" in module && module.target)}
                title={"target" in module && module.target ? undefined : "Disponível em breve"}
                key={module.label}
                onClick={() => {
                  if (!onNavigate || !("target" in module && module.target)) {
                    return;
                  }

                  onNavigate(module.target);
                }}
                type="button"
              >
                <div className="module-card-group">{module.group}</div>
                <div className="module-card-name">
                  {module.label}
                  {!("target" in module && module.target) ? " - em breve" : ""}
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
