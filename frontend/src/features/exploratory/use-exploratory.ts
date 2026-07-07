import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { notify } from "@/lib/notify";
import {
  SCENARIO_COLORS,
  type ModuleExploratoryConfig,
  type Scenario,
  type SliderConfig,
} from "@/features/exploratory/types";

export type ExploratoryState = {
  applyFields: (fields: Record<string, string>) => void;
  changeField: (field: string, value: string) => void;
  describeScenario: () => string;
};

const DEBOUNCE_MS = 300;

export function useExploratory(
  config: ModuleExploratoryConfig,
  state: ExploratoryState,
) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [sliderValues, setSliderValues] = useState<Record<string, number>>({});
  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const stateRef = useRef(state);
  stateRef.current = state;

  const templatesByKey = useMemo(() => {
    const mapped: Record<string, (typeof config.templates)[number]> = {};
    for (const template of config.templates) {
      mapped[template.key] = template;
    }
    return mapped;
  }, [config]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      Object.values(pending).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const applyTemplate = useCallback(
    (key: string) => {
      const template = templatesByKey[key];
      if (!template) {
        return;
      }

      setActiveKey(key);
      stateRef.current.applyFields(template.fields);

      const nextValues: Record<string, number> = {};
      for (const slider of template.sliders) {
        nextValues[slider.id] = slider.default;
      }
      setSliderValues(nextValues);
    },
    [templatesByKey],
  );

  const sliderValue = useCallback(
    (id: string) => sliderValues[id] ?? 0,
    [sliderValues],
  );

  const onSlider = useCallback((config: SliderConfig, value: number) => {
    setSliderValues((current) => ({ ...current, [config.id]: value }));

    const existing = timers.current[config.id];
    if (existing) {
      clearTimeout(existing);
    }

    timers.current[config.id] = setTimeout(() => {
      const raw = String(value);
      stateRef.current.changeField(config.field, raw);
      (config.linkedFields ?? []).forEach((field) =>
        stateRef.current.changeField(field, raw),
      );
      (config.extraFields ?? []).forEach((field) =>
        stateRef.current.changeField(field, raw),
      );
    }, DEBOUNCE_MS);
  }, []);

  const saveScenario = useCallback(() => {
    setScenarios((current) => {
      if (current.length >= 3) {
        notify.error("Use no máximo 3 cenários por módulo.");
        return current;
      }

      const scenario: Scenario = {
        id: `${config.module}-${Date.now()}-${current.length}`,
        name: stateRef.current.describeScenario(),
        color: SCENARIO_COLORS[current.length],
      };
      return [...current, scenario];
    });
  }, [config.module]);

  const clearScenarios = useCallback(() => {
    setScenarios([]);
  }, []);

  return {
    activeKey,
    applyTemplate,
    sliderValue,
    onSlider,
    scenarios,
    saveScenario,
    clearScenarios,
  };
}

export type ExploratoryController = ReturnType<typeof useExploratory>;
