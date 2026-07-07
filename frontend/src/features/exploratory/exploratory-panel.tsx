import { useEffect, type ReactNode } from "react";

import { GuidedSteps } from "@/features/exploratory/guided-steps";
import { ParamSlider } from "@/features/exploratory/param-slider";
import { ScenarioComparison } from "@/features/exploratory/scenario-comparison";
import { TemplateSelector } from "@/features/exploratory/template-selector";
import type { ModuleExploratoryConfig, Scenario } from "@/features/exploratory/types";
import {
  type ExploratoryState,
  useExploratory,
} from "@/features/exploratory/use-exploratory";

export function ExploratoryPanel({
  config,
  state,
  children,
  onScenariosChange,
}: {
  config: ModuleExploratoryConfig;
  state: ExploratoryState;
  children?: (scenarios: Scenario[]) => ReactNode;
  onScenariosChange?: (scenarios: Scenario[]) => void;
}) {
  const controller = useExploratory(config, state);
  const activeTemplate = config.templates.find(
    (template) => template.key === controller.activeKey,
  );

  useEffect(() => {
    onScenariosChange?.(controller.scenarios);
  }, [controller.scenarios, onScenariosChange]);

  return (
    <section
      aria-label="Painel Exploratório"
      className="mt-6 rounded-[1.25rem] border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-5 shadow-sm"
    >
      <TemplateSelector
        templates={config.templates}
        activeKey={controller.activeKey}
        onSelect={controller.applyTemplate}
      />

      {children ? children(controller.scenarios) : null}

      {activeTemplate ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {activeTemplate.sliders.map((slider) => (
              <ParamSlider
                key={slider.id}
                config={slider}
                value={controller.sliderValue(slider.id)}
                onChange={(value) => controller.onSlider(slider, value)}
              />
            ))}
          </div>

          <GuidedSteps steps={activeTemplate.steps} activity={activeTemplate.activity} />

          <ScenarioComparison
            scenarios={controller.scenarios}
            onSave={controller.saveScenario}
            onClear={controller.clearScenarios}
          />
        </>
      ) : null}
    </section>
  );
}
