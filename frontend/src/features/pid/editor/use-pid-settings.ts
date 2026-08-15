import { useCallback, useEffect, useState } from "react";

export type PidIconSize = "sm" | "md" | "lg";
export type PidTextSize = "sm" | "md" | "lg";

export interface PidSettings {
  iconSize: PidIconSize;
  textSize: PidTextSize;
  catalogThumbSize: number;
}

const STORAGE_KEY = "pid:settings";
const DEFAULTS: PidSettings = Object.freeze({ iconSize: "md" as const, textSize: "md" as const, catalogThumbSize: 40 });

function readSettings(): PidSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      iconSize: isValidIconSize(parsed.iconSize) ? parsed.iconSize : DEFAULTS.iconSize,
      textSize: isValidTextSize(parsed.textSize) ? parsed.textSize : DEFAULTS.textSize,
      catalogThumbSize: isValidThumbSize(parsed.catalogThumbSize) ? parsed.catalogThumbSize : DEFAULTS.catalogThumbSize,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function isValidIconSize(value: unknown): value is PidIconSize {
  return value === "sm" || value === "md" || value === "lg";
}

function isValidTextSize(value: unknown): value is PidTextSize {
  return value === "sm" || value === "md" || value === "lg";
}

function isValidThumbSize(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 24 && value <= 72;
}

export function usePidSettings() {
  const [settings, setSettings] = useState<PidSettings>(readSettings);

  const updateSetting = useCallback(<K extends keyof PidSettings>(key: K, value: PidSettings[K]) => {
    const current = readSettings();
    const next = { ...current, [key]: value };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSettings(next);
  }, []);

  const resetSettings = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULTS));
    setSettings({ ...DEFAULTS });
  }, []);

  return { settings, updateSetting, resetSettings } as const;
}
