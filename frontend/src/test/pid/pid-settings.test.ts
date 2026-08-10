import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { usePidSettings } from "@/features/pid/editor/use-pid-settings";

describe("usePidSettings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns defaults when localStorage is empty", () => {
    const { result } = renderHook(() => usePidSettings());
    expect(result.current.settings).toEqual({ iconSize: "md", textSize: "md", catalogThumbSize: 40 });
  });

  it("updates iconSize and persists to localStorage", () => {
    const { result } = renderHook(() => usePidSettings());
    act(() => result.current.updateSetting("iconSize", "lg"));
    expect(result.current.settings.iconSize).toBe("lg");
    expect(JSON.parse(localStorage.getItem("pid:settings")!).iconSize).toBe("lg");
  });

  it("updates catalogThumbSize", () => {
    const { result } = renderHook(() => usePidSettings());
    act(() => result.current.updateSetting("catalogThumbSize", 64));
    expect(result.current.settings.catalogThumbSize).toBe(64);
  });

  it("resetSettings restores defaults", () => {
    const { result } = renderHook(() => usePidSettings());
    act(() => result.current.updateSetting("iconSize", "sm"));
    act(() => result.current.updateSetting("textSize", "lg"));
    act(() => result.current.resetSettings());
    expect(result.current.settings).toEqual({ iconSize: "md", textSize: "md", catalogThumbSize: 40 });
  });

  it("falls back to defaults for corrupt localStorage", () => {
    localStorage.setItem("pid:settings", "not-json");
    const { result } = renderHook(() => usePidSettings());
    expect(result.current.settings).toEqual({ iconSize: "md", textSize: "md", catalogThumbSize: 40 });
  });

  it("clamps invalid thumbnail size to default", () => {
    localStorage.setItem("pid:settings", JSON.stringify({ catalogThumbSize: 999 }));
    const { result } = renderHook(() => usePidSettings());
    expect(result.current.settings.catalogThumbSize).toBe(40);
  });
});
