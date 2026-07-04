import { AppShell } from "@/features/shell/app-shell";
import { learningTrails, quickAccessModules } from "@/features/shell/navigation";
import {
  ActionButton,
  CompactBars,
  DashboardHero,
  DidacticList,
  FlowBackdrop,
  SurfaceCard
} from "@/features/shell/shell-ui";

const HOME_METRICS = [
  { label: "Módulos ativos", value: "4", detail: "Tubulações, dimensionamento, escoamento e glossário." },
  { label: "Trilhas guiadas", value: "3", detail: "Percursos para estudo autônomo e aula presencial." },
  { label: "Público-alvo", value: "2", detail: "Docentes e discentes usando a mesma linguagem visual." }
] as const;

const TEACHING_GUIDE = [
  {
    title: "Uso em aula",
    detail: "Abra a simulação, discuta o conceito e compare o resultado com o que a turma espera teoricamente."
  },
  {
    title: "Uso em estudo",
    detail: "Comece por uma trilha, consulte o glossário e avance para os módulos de cálculo com mais segurança."
  },
  {
    title: "Uso em laboratório",
    detail: "Leve as leituras de Reynolds, fator de atrito e dimensionamento como apoio para interpretação de dados."
  }
] as const;

type HomePageProps = {
  onNavigate?: (tabId: string) => void;
};

export function HomePage({ onNavigate }: HomePageProps) {
  return (
    <AppShell onNavigate={onNavigate}>
      <div className="tab-pane active" id="home-content">
        <div className="page-stack">
          <DashboardHero
            actions={
              <>
                <ActionButton onClick={() => onNavigate?.("simulations")} type="button">
                  Iniciar uma simulação
                </ActionButton>
                <ActionButton onClick={() => onNavigate?.("trails")} tone="secondary" type="button">
                  Seguir uma trilha
                </ActionButton>
              </>
            }
            description="Uma interface única para docentes e discentes da Engenharia Química explorarem cálculos, conceitos e rotas de aprendizagem com apoio visual mais forte."
            eyebrow="Laboratório digital"
            metrics={HOME_METRICS.map((metric) => ({
              label: metric.label,
              value: metric.value,
              detail: metric.detail
            }))}
            note="A leitura é a mesma para sala, estudo individual e demonstração em monitoria: cada módulo traz contexto, cálculo e interpretação."
            title="Operações unitárias com navegação didática e foco em leitura de engenharia."
            visual={<FlowBackdrop />}
          />

          <div className="home-grid">
            <div className="home-section-stack">
              <SurfaceCard
                eyebrow="Percursos de uso"
                title="Trilhas de Aprendizagem"
                description="Cada trilha ajuda a enxergar como os módulos se encadeiam em uma sequência de estudo."
              >
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
              </SurfaceCard>

              <SurfaceCard
                eyebrow="Leitura orientada"
                title="Para Docência"
                description="Pontos de uso rápido para transformar a ferramenta em apoio de aula."
              >
                <DidacticList title="Como conduzir a demonstração" items={TEACHING_GUIDE} />
              </SurfaceCard>
            </div>

            <div className="home-section-stack">
              <SurfaceCard
                eyebrow="Entrada rápida"
                title="Recursos de Apoio"
                description="Os módulos ativos já podem ser acessados diretamente; os demais aparecem como futuras expansões da tese."
              >
                <CompactBars
                  bars={[
                    { label: "Tubulações", value: 3, detail: "módulo", tone: "accent" },
                    { label: "Dimensionamento", value: 2, detail: "etapas", tone: "default" },
                    { label: "Escoamento", value: 4, detail: "cálculos", tone: "success" }
                  ]}
                  description="Uma visão compacta do núcleo funcional hoje disponível."
                  title="Cobertura atual"
                />
              </SurfaceCard>

              <SurfaceCard eyebrow="Acesso rápido" title="Módulos em foco">
                <div className="module-grid">
                  {quickAccessModules.map((module) => {
                    const isDisabled = "disabled" in module && module.disabled === true;

                    return (
                      <button
                        className="module-card"
                        disabled={isDisabled}
                        key={module.label}
                        title={isDisabled ? "Disponível em breve" : undefined}
                        type="button"
                        onClick={() => {
                          if (!onNavigate || isDisabled || !("target" in module) || !module.target) {
                            return;
                          }

                          onNavigate(module.target);
                        }}
                      >
                        <div className="module-card-group">{module.group}</div>
                        <div className="module-card-name">
                          {module.label}
                          {isDisabled ? " · em breve" : ""}
                        </div>
                        <div className="module-card-description">
                          {isDisabled
                            ? "Planejado para ampliar o roteiro didático depois da primeira versão."
                            : `Abrir a leitura guiada de ${module.label.toLowerCase()}.`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </SurfaceCard>
            </div>
          </div>

          <SurfaceCard
            eyebrow="Mapa de navegação"
            title="Como a ferramenta se organiza"
            description="A barra lateral representa a entrada principal; os módulos se concentram em cálculo e o glossário sustenta a leitura conceitual."
          >
            <div className="home-stat-band">
              <div className="home-stat">
                <div className="home-stat-value">Simulações</div>
                <div className="home-stat-label">núcleo interativo</div>
                <div className="home-stat-detail">
                  Tubulações, dimensionamento e escoamento ficam agrupados para facilitar comparação entre casos.
                </div>
              </div>
              <div className="home-stat">
                <div className="home-stat-value">Trilhas</div>
                <div className="home-stat-label">sequência pedagógica</div>
                <div className="home-stat-detail">
                  Encadeiam o uso da ferramenta do nível conceitual até a aplicação prática.
                </div>
              </div>
              <div className="home-stat">
                <div className="home-stat-value">Docência</div>
                <div className="home-stat-label">apoio à sala</div>
                <div className="home-stat-detail">
                  Leitura pensada para aula expositiva, monitoria e revisão autônoma.
                </div>
              </div>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </AppShell>
  );
}
