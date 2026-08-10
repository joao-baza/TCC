import { useCallback, useSyncExternalStore } from "react";

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

const subscribers = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

function writeSettings(settings: PidSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  subscribers.forEach((subscriber) => subscriber());
}

export function usePidSettings() {
  const settings = useSyncExternalStore(
    subscribe,
    readSettings,
    () => DEFAULTS,
  );

  const updateSetting = useCallback(<K extends keyof PidSettings>(key: K, value: PidSettings[K]) => {
    const current = readSettings();
    writeSettings({ ...current, [key]: value });
  }, []);

  const resetSettings = useCallback(() => {
    writeSettings({ ...DEFAULTS });
  }, []);

  return { settings, updateSetting, resetSettings } as const;
}
