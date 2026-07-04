"use client";

import { useState } from "react";
import { FlowFeature } from "@/features/flow/flow-feature";
import { GlossaryFeature } from "@/features/glossary/glossary-feature";
import { PipingFeature } from "@/features/piping/piping-feature";
import { HomePage } from "@/features/shell/home-page";
import { AppShell } from "@/features/shell/app-shell";
import { resolveProductSection, resolveSimulationModule, shellNavigation } from "@/features/shell/module-registry";
import { SizingFeature } from "@/features/sizing/sizing-feature";
import { apiClient, type EngineeringApi } from "@/lib/api";

type AppExperienceProps = {
  api?: EngineeringApi;
};

type SimulationModuleId = (typeof shellNavigation.simulations)[number]["id"];

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
    return (
      <div className="app-home-shell">
        <div className="home-hero">
          <h1>DCOU - Dimensionamento Computacional de Operações Unitárias</h1>
          <p>Escolha uma entrada principal para continuar a navegação do produto.</p>
          <button
            className="module-card"
            onClick={() => handleNavigate("simulations")}
            type="button"
          >
            Iniciar uma simulação
          </button>
        </div>

        <HomePage onNavigate={handleNavigate} />
      </div>
    );
  }

  const simulationFeature =
    currentModule === "piping" ? <PipingFeature api={api} /> :
    currentModule === "sizing" ? <SizingFeature api={api} /> :
    currentModule === "flow" ? <FlowFeature api={api} /> :
    <GlossaryFeature />;

  return (
      <AppShell
        currentSection={currentSection}
        currentTab={currentModule}
        onNavigate={handleNavigate}
      >
      {currentSection === "simulations" ? (
        <div className="tab-pane active" id="simulations-content">
          <div className="home-hero">
            <h1>Simulações em Destaque</h1>
            <p>
              Escolha um módulo de cálculo para continuar a navegação interna do produto.
            </p>
          </div>

          <section className="home-section">
            <div className="home-section-title">Módulos em foco</div>
            <div className="module-grid">
              {shellNavigation.simulations.map((module) => (
                <button
                  className="module-card"
                  aria-label={`Abrir módulo de ${module.label}`}
                  key={module.id}
                  onClick={() => handleNavigate(module.id)}
                  type="button"
                >
                  <div aria-hidden="true" className="module-card-group">
                    {module.group}
                  </div>
                  <div aria-hidden="true" className="module-card-name">
                    Abrir módulo de {module.label}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="home-section">{simulationFeature}</section>
        </div>
      ) : null}
      {currentSection === "trails" ? <div className="tab-pane active" id="trails-content" /> : null}
      {currentSection === "resources" ? <div className="tab-pane active" id="resources-content" /> : null}
      {currentSection === "teaching" ? <div className="tab-pane active" id="teaching-content" /> : null}
    </AppShell>
  );
}
