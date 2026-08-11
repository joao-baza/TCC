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
