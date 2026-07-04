"use client";

import { useState } from "react";
import { FlowFeature } from "@/features/flow/flow-feature";
import { GlossaryFeature } from "@/features/glossary/glossary-feature";
import { PipingFeature } from "@/features/piping/piping-feature";
import { HomePage } from "@/features/shell/home-page";
import { AppShell } from "@/features/shell/app-shell";
import { resolveProductSection, resolveSimulationModule, shellNavigation } from "@/features/shell/module-registry";
import {
  ActionButton,
  DashboardHero,
  DidacticList,
  FlowBackdrop,
  SectionHeader,
  SurfaceCard
} from "@/features/shell/shell-ui";
import { SizingFeature } from "@/features/sizing/sizing-feature";
import { apiClient, type EngineeringApi } from "@/lib/api";

type AppExperienceProps = {
  api?: EngineeringApi;
};

type SimulationModuleId = (typeof shellNavigation.simulations)[number]["id"];

const SECTION_COPY: Record<
  "trails" | "resources" | "teaching",
  { eyebrow: string; title: string; copy: string; action: string; bullets: Array<{ title: string; detail: string }> }
> = {
  trails: {
    eyebrow: "Didática",
    title: "Trilhas de aprendizagem",
    copy: "Caminhos curtos e explicados para orientar os estudantes sem sobrecarregar a interface.",
    action: "Voltar para a home",
    bullets: [
      { title: "Transporte de fluidos", detail: "Tubulações, dimensionamento e escoamento em sequência lógica." },
      { title: "Reatores ideais", detail: "Propriedades de componentes e reatores CSTR / PFR." },
      { title: "Fechamento conceitual", detail: "Balanço de massa e revisão de leitura técnica." }
    ]
  },
  resources: {
    eyebrow: "Apoio",
    title: "Recursos de apoio",
    copy: "Materiais de consulta e apoio visual para uso em aula, monitoria e estudo autônomo.",
    action: "Explorar simulações",
    bullets: [
      { title: "Glossário", detail: "Termos-chave para reduzir troca de contexto durante a navegação." },
      { title: "Propriedades", detail: "Consulta rápida para usar os módulos com mais segurança." },
      { title: "Leitura assistida", detail: "Cartões compactos para mostrar o que cada módulo resolve." }
    ]
  },
  teaching: {
    eyebrow: "Docência",
    title: "Para docência",
    copy: "Um ponto de partida para apresentação em sala, discussão e contextualização dos cálculos.",
    action: "Ir para as trilhas",
    bullets: [
      { title: "Abra pelo problema", detail: "Apresente a pergunta antes da fórmula para manter a turma orientada." },
      { title: "Mostre a variável", detail: "Relacione cada entrada com o efeito físico esperado." },
      { title: "Feche com interpretação", detail: "Use o resultado para discutir regime, escolha e segurança." }
    ]
  }
};

export function AppExperience({ api = apiClient }: AppExperienceProps) {
  const [currentSection, setCurrentSection] = useState("home");
  const [currentModule, setCurrentModule] = useState<SimulationModuleId>("flow");

  function handleNavigate(target: string) {
    const nextSection = resolveProductSection(target);
    const nextModule = resolveSimulationModule(target);

    setCurrentSection(nextSection);

    if (nextSection === "simulations" && nextModule) {
      setCurrentModule(nextModule);
    }
  }

  if (currentSection === "home") {
    return <HomePage onNavigate={handleNavigate} />;
  }

  const simulationFeature =
    currentModule === "piping" ? <PipingFeature api={api} /> :
    currentModule === "sizing" ? <SizingFeature api={api} /> :
    currentModule === "flow" ? <FlowFeature api={api} /> :
    <GlossaryFeature />;

  if (currentSection === "simulations") {
    return (
      <AppShell currentSection={currentSection} currentTab={currentModule} onNavigate={handleNavigate}>
        <div className="tab-pane active" id="simulations-content">
          <DashboardHero
            actions={
              <>
                <ActionButton onClick={() => handleNavigate("home")} tone="secondary" type="button">
                  Voltar para a home
                </ActionButton>
                <ActionButton onClick={() => handleNavigate("glossary")} type="button">
                  Abrir glossário
                </ActionButton>
              </>
            }
            description="Escolha um módulo de cálculo e avance para uma leitura visual mais rápida do problema, da solução e da interpretação."
            eyebrow="Simulações em destaque"
            metrics={[
              { label: "Módulos", value: String(shellNavigation.simulations.length), detail: "Atalhos para cálculo e leitura aplicada." },
              { label: "Atual", value: shellNavigation.simulations.find((module) => module.id === currentModule)?.label ?? "Flow", detail: "Módulo atualmente em foco." },
              { label: "Fluxo", value: "Guiado", detail: "A navegação lateral continua preservada." }
            ]}
            note="O usuário pode alternar entre módulos sem perder o contexto visual nem a posição de navegação."
            title="Simulações em Destaque"
            visual={<FlowBackdrop />}
          />

          <SurfaceCard
            className="module-page"
            eyebrow="Módulos em foco"
            title="Troca rápida entre fluxos relacionados"
            description="Os atalhos abaixo ajudam a percorrer o núcleo num ritmo de aula ou de estudo individual."
          >
            <div className="module-grid">
              {shellNavigation.simulations.map((module) => (
                <button
                  aria-label={`Abrir módulo de ${module.label}`}
                  className={`module-card${currentModule === module.id ? " module-card--active" : ""}`}
                  key={module.id}
                  onClick={() => handleNavigate(module.id)}
                  type="button"
                >
                  <div className="module-card-group">{module.group}</div>
                  <div className="module-card-name">{module.label}</div>
                  <div className="module-card-description">Atalho para levar o usuário ao cálculo específico.</div>
                </button>
              ))}
            </div>
          </SurfaceCard>

          <div className="module-page-grid">
            <div className="module-stack">{simulationFeature}</div>
            <SurfaceCard
              eyebrow="Leitura rápida"
              title="Como usar este núcleo"
              description="Um resumo operacional para não perder a função pedagógica enquanto navega."
            >
              <DidacticList
                items={[
                  { title: "Escolha o problema", detail: "Abra o módulo que mais se aproxima da questão em sala." },
                  { title: "Preencha as variáveis", detail: "Os campos correspondem à leitura física que o cálculo exige." },
                  { title: "Interprete o resultado", detail: "Observe unidade, magnitude e implicações de engenharia." }
                ]}
                title="Passo a passo"
              />
            </SurfaceCard>
          </div>
        </div>
      </AppShell>
    );
  }

  const sectionState = SECTION_COPY[currentSection as keyof typeof SECTION_COPY] ?? SECTION_COPY.resources;
  const sectionPrimaryTarget =
    currentSection === "trails"
      ? "home"
      : currentSection === "teaching"
        ? "trails"
        : "simulations";

  return (
    <AppShell currentSection={currentSection} onNavigate={handleNavigate}>
      <div className="tab-pane active" id={`${currentSection}-content`}>
        <DashboardHero
          actions={
            <ActionButton onClick={() => handleNavigate(sectionPrimaryTarget)} type="button">
              {sectionState.action}
            </ActionButton>
          }
          description={sectionState.copy}
          eyebrow={sectionState.eyebrow}
          metrics={[
            { label: "Seção", value: sectionState.title, detail: "Mantém a leitura dentro do mesmo dashboard." },
            { label: "Objetivo", value: "Didático", detail: "Conectar consulta, cálculo e contexto." },
            { label: "Entrada", value: "Rápida", detail: "Sem troca desnecessária de contexto." }
          ]}
          note="Essas áreas continuam ativas porque ajudam a explicar a ferramenta para o aluno antes de ele entrar no cálculo."
          title={sectionState.title}
          visual={<FlowBackdrop />}
        />

        <div className="module-page-grid">
          <SurfaceCard eyebrow="Resumo pedagógico" title={sectionState.title} description={sectionState.copy}>
            <DidacticList title="Pontos principais" items={sectionState.bullets} />
          </SurfaceCard>

          <SurfaceCard eyebrow="Contexto" title="Como navegar daqui">
            <SectionHeader title="Ações sugeridas" description="O próximo passo depende do foco da aula ou da exploração do usuário." />
            <div className="home-secondary-actions">
              <ActionButton onClick={() => handleNavigate("simulations")} tone="secondary" type="button">
                Explorar simulações
              </ActionButton>
              <ActionButton onClick={() => handleNavigate("home")} tone="secondary" type="button">
                Voltar ao início
              </ActionButton>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </AppShell>
  );
}
