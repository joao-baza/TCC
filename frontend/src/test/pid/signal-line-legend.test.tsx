import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { signalLineLegendItems } from "@/features/pid/canvas/signal-line-pattern";
import { SignalLineLegend } from "@/features/pid/editor/signal-line-legend";

function renderLegend(overrides: Partial<Parameters<typeof SignalLineLegend>[0]> = {}) {
  const props: Parameters<typeof SignalLineLegend>[0] = {
    selectedEdgeId: "edge-1",
    minimized: false,
    onApplyLineStyle: vi.fn(),
    onClose: vi.fn(),
    onMinimize: vi.fn(),
    onRestore: vi.fn(),
    ...overrides,
  };
  return { ...render(<SignalLineLegend {...props} />), props };
}

it("aplica estilo quando há uma aresta selecionada", () => {
  const onApplyLineStyle = vi.fn();
  renderLegend({ onApplyLineStyle });

  expect(screen.getByRole("dialog", { name: "Sinais utilizados nos fluxogramas de processo" })).toBeInTheDocument();
  for (const item of signalLineLegendItems) expect(screen.getByText(item.label)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Aplicar Sinal pneumático" }));

  expect(onApplyLineStyle).toHaveBeenCalledWith("pneumatic-signal");
});

it("funciona como referência e minimiza sem aresta selecionada", () => {
  const onApplyLineStyle = vi.fn();
  const onMinimize = vi.fn();
  const { rerender, props } = renderLegend({ selectedEdgeId: null, onApplyLineStyle, onMinimize });

  fireEvent.click(screen.getByText("Sinal pneumático").closest("[role='listitem']")!);
  expect(onApplyLineStyle).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Minimizar legenda de sinais" }));
  expect(onMinimize).toHaveBeenCalledTimes(1);

  rerender(<SignalLineLegend {...props} minimized />);
  expect(screen.queryByText("Sinal pneumático")).not.toBeInTheDocument();
});

it("usa posicionamento fixo do canvas quando aberta pelo topo", () => {
  renderLegend({ placement: "canvas" });

  expect(screen.getByRole("dialog", { name: "Sinais utilizados nos fluxogramas de processo" })).toHaveClass("pid-canvas-signal-legend");
});

it("mostra a amostra com a mesma linha renderizada no canvas", () => {
  const { container } = renderLegend({ selectedEdgeId: null });

  const pneumaticLine = container.querySelector('[data-signal-line-style="pneumatic-signal"] .react-flow__edge-path');
  const electricLine = container.querySelector('[data-signal-line-style="electric-signal"] .react-flow__edge-path');
  const pneumaticGlyphs = container.querySelectorAll('[data-signal-line-style="pneumatic-signal"] [data-glyph="diagonal-pair"]');
  const pneumaticPreview = pneumaticLine?.closest("svg");

  expect(pneumaticLine).toHaveAttribute("d", "M 8 18 L 168 18");
  expect(pneumaticLine).toHaveAttribute("stroke", "#64748b");
  expect(pneumaticPreview?.style.getPropertyValue("--xy-edge-stroke")).toBe("#64748b");
  expect(pneumaticPreview?.style.getPropertyValue("--xy-edge-stroke-selected")).toBe("#2563eb");
  expect(pneumaticGlyphs.length).toBeGreaterThan(1);
  expect(electricLine).toHaveAttribute("stroke-dasharray", "14 7");
});

it.each([
  ["guided-electromagnetic-sonic", "open-circle"],
  ["software-link", "software-circle"],
  ["mechanical-link", "concentric-circle"],
] as const)("mantém a linha visível cruzando os símbolos de %s", (lineStyle, glyph) => {
  const { container } = renderLegend({ selectedEdgeId: null });
  const preview = container.querySelector(`[data-signal-line-style="${lineStyle}"]`);

  expect(preview?.querySelector(".react-flow__edge-path")).toHaveAttribute("d", "M 8 18 L 168 18");
  for (const circle of preview?.querySelectorAll(`[data-glyph="${glyph}"] circle`) ?? []) {
    expect(circle).toHaveAttribute("fill", "none");
  }
});

it.each([
  ["pneumatic-signal", "diagonal-pair"],
  ["capillary-tube", "x-mark"],
  ["unguided-electromagnetic-sonic", "wave"],
  ["mechanical-link", "concentric-circle"],
  ["binary-electric-signal", "binary-cross"],
] as const)("desenha a linha por cima dos glifos de %s", (lineStyle, glyph) => {
  const { container } = renderLegend({ selectedEdgeId: null });
  const preview = container.querySelector(`[data-signal-line-style="${lineStyle}"]`);

  expect(preview?.querySelector(`[data-glyph="${glyph}"]`)).toBeInTheDocument();
  expect(preview?.lastElementChild).toHaveClass("react-flow__edge-path");
});
