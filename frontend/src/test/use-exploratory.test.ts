import { act, renderHook } from "@testing-library/react";

import { reactorExploratory, sizingExploratory } from "@/features/exploratory/templates";
import { useExploratory } from "@/features/exploratory/use-exploratory";

const notifyError = vi.fn();

vi.mock("@/lib/notify", () => ({
  notify: {
    success: vi.fn(),
    error: (message: string) => notifyError(message),
    info: vi.fn(),
  },
}));

function makeState() {
  return {
    applyFields: vi.fn(),
    changeField: vi.fn(),
    describeScenario: vi.fn(() => "Q=0.01 m3/s, v=1.5 m/s"),
  };
}

describe("useExploratory", () => {
  beforeEach(() => {
    notifyError.mockClear();
  });

  it("applyTemplate applies fields and calibrates sliders to defaults", () => {
    const state = makeState();
    const { result } = renderHook(() => useExploratory(sizingExploratory, state));

    act(() => result.current.applyTemplate("process-line"));

    expect(result.current.activeKey).toBe("process-line");
    expect(state.applyFields).toHaveBeenCalledWith({
      "flow-rate": "0.01",
      velocity: "1.5",
    });
    expect(result.current.sliderValue("sizing-sl-flow")).toBe(0.01);
    expect(result.current.sliderValue("sizing-sl-vel")).toBe(1.5);
  });

  it("onSlider updates local value immediately and propagates after 300ms", () => {
    vi.useFakeTimers();

    try {
      const state = makeState();
      const { result } = renderHook(() => useExploratory(sizingExploratory, state));

      act(() => result.current.applyTemplate("process-line"));

      const config = sizingExploratory.templates[0].sliders[0];
      act(() => result.current.onSlider(config, 0.02));

      expect(result.current.sliderValue("sizing-sl-flow")).toBe(0.02);
      expect(state.changeField).not.toHaveBeenCalled();

      act(() => vi.advanceTimersByTime(300));

      expect(state.changeField).toHaveBeenCalledWith("flow-rate", "0.02");
    } finally {
      vi.useRealTimers();
    }
  });

  it("propagates linkedFields and extraFields from reactor after debounce", () => {
    vi.useFakeTimers();

    try {
      const state = makeState();
      const { result } = renderHook(() => useExploratory(reactorExploratory, state));

      act(() => result.current.applyTemplate("first-order"));

      const conversionSlider = reactorExploratory.templates[0].sliders[0];
      act(() => result.current.onSlider(conversionSlider, 0.5));
      act(() => vi.advanceTimersByTime(300));

      expect(state.changeField).toHaveBeenCalledWith("cstr-conversion", "0.5");
      expect(state.changeField).toHaveBeenCalledWith("pfr-conversion", "0.5");
      expect(state.changeField).toHaveBeenCalledWith("plot-max-conversion", "0.5");
    } finally {
      vi.useRealTimers();
    }
  });

  it("saveScenario respects the max of 3 and uses colors in order", () => {
    const state = makeState();
    const { result } = renderHook(() => useExploratory(sizingExploratory, state));

    act(() => result.current.applyTemplate("process-line"));
    act(() => result.current.saveScenario());
    act(() => result.current.saveScenario());
    act(() => result.current.saveScenario());

    expect(result.current.scenarios.map((scenario) => scenario.color)).toEqual([
      "#2563EB",
      "#D97706",
      "#16A34A",
    ]);
    expect(result.current.scenarios[0].name).toBe("Q=0.01 m3/s, v=1.5 m/s");

    act(() => result.current.saveScenario());

    expect(result.current.scenarios).toHaveLength(3);
    expect(notifyError).toHaveBeenCalledWith("Use no máximo 3 cenários por módulo.");
  });

  it("clearScenarios empties the list", () => {
    const state = makeState();
    const { result } = renderHook(() => useExploratory(sizingExploratory, state));

    act(() => result.current.applyTemplate("process-line"));
    act(() => result.current.saveScenario());
    act(() => result.current.clearScenarios());

    expect(result.current.scenarios).toHaveLength(0);
  });
});
