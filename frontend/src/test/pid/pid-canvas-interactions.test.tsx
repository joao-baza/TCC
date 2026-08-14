import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { StrictMode, useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { PidCanvas, pidCanvasViewportDuration } from "@/features/pid/canvas/pid-canvas";
import { applyPidCanvasSelection, projectPidCanvasDocument } from "@/features/pid/canvas/flow-projection";
import { localCatalog } from "@/features/pid/catalog/fixtures/catalog";
import type { PidDocument, PidEdge, PidNode, PidPort } from "@/features/pid/domain/model";
import { applyCommand, type PidCommand } from "@/features/pid/domain/commands";
import { installPidCanvasGeometryHarness } from "./pid-canvas-harness";

let restoreCanvasGeometry: () => void;
beforeAll(() => { restoreCanvasGeometry = installPidCanvasGeometryHarness(); });
afterAll(() => restoreCanvasGeometry());

const ids = {
  pump: "20000000-0000-4000-8000-000000000001",
  tank: "20000000-0000-4000-8000-000000000002",
  valve: "20000000-0000-4000-8000-000000000003",
  instrument: "20000000-0000-4000-8000-000000000004",
  pumpOut: "30000000-0000-4000-8000-000000000001",
  tankIn: "30000000-0000-4000-8000-000000000002",
  valveIn: "30000000-0000-4000-8000-000000000003",
  valveSignal: "30000000-0000-4000-8000-000000000004",
  signalOut: "30000000-0000-4000-8000-000000000005",
  utility: "30000000-0000-4000-8000-000000000006",
  utilityTarget: "30000000-0000-4000-8000-000000000007",
} as const;

describe("integrações acessíveis e transientes do PidCanvas", () => {
  it("zera dinamicamente as durações de viewport com movimento reduzido", async () => {
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    let reduced = false;
    const matchMedia = vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: query === "(prefers-reduced-motion: reduce)" && reduced,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => listeners.add(listener as (event: MediaQueryListEvent) => void),
      removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => listeners.delete(listener as (event: MediaQueryListEvent) => void),
      dispatchEvent: () => false,
    }));
    try {
      const { rerender } = render(<PidCanvas document={interactionDocument()} catalog={localCatalog} editable={false} onCommand={vi.fn()} viewportAction={{ type: "zoom-in", nonce: 1 }} />);
      expect(screen.getByTestId("pid-canvas")).toHaveAttribute("data-viewport-animation-duration", "150");
      expect(pidCanvasViewportDuration("fit", false)).toBe(200);

      reduced = true;
      listeners.forEach((listener) => listener({ matches: true } as MediaQueryListEvent));
      rerender(<PidCanvas document={interactionDocument()} catalog={localCatalog} editable={false} onCommand={vi.fn()} viewportAction={{ type: "zoom-out", nonce: 2 }} />);
      await waitFor(() => expect(screen.getByTestId("pid-canvas")).toHaveAttribute("data-viewport-animation-duration", "0"));
      expect(pidCanvasViewportDuration("fit", true)).toBe(0);
      expect(pidCanvasViewportDuration("zoom-in", true)).toBe(0);
    } finally {
      matchMedia.mockRestore();
    }
  });
  it("renderiza e seleciona anotações canônicas no canvas", () => {
    const initial = interactionDocument();
    const annotationId = "60000000-0000-4000-8000-000000000001";
    initial.annotations[annotationId] = {
      id: annotationId,
      kind: "text",
      text: "Nota operacional",
      x: 120,
      y: 80,
      width: 180,
      height: 56,
      rotation: 0,
      properties: {},
    };
    const onSelectionChange = vi.fn();
    render(<PidCanvas document={initial} catalog={localCatalog} editable onCommand={vi.fn()} onSelectionChange={onSelectionChange} />);
    const annotation = screen.getByRole("button", { name: "Anotação: Nota operacional" });
    expect(annotation).toBeVisible();
    fireEvent.click(annotation);
    expect(onSelectionChange).toHaveBeenLastCalledWith({ nodeIds: [], edgeIds: [], annotationIds: [annotationId] });
    expect(annotation).toHaveAttribute("aria-pressed", "true");
  });
  it("arrasta card de anotação e emite selection.move canônico", async () => {
    const initial = documentWithAnnotationAndEdge();
    const annotationId = "60000000-0000-4000-8000-000000000001";
    const onCommand = vi.fn();
    render(<PidCanvas document={initial} catalog={localCatalog} editable onCommand={onCommand} />);
    const annotation = screen.getByRole("button", { name: "Anotação: Nota operacional" });
    expect(annotation).toHaveClass("nodrag", "nopan");

    dispatchFlowPointerEvent(annotation, "pointerdown", { button: 0, clientX: 120, clientY: 80 });
    dispatchFlowPointerEvent(window, "pointermove", { clientX: 152, clientY: 96 });
    await waitFor(() => {
      expect(annotation.style.left).toBe("152px");
      expect(annotation.style.top).toBe("96px");
    });
    expect(onCommand).not.toHaveBeenCalled();
    dispatchFlowPointerEvent(window, "pointerup", { button: 0, clientX: 152, clientY: 96 });

    await waitFor(() => expect(onCommand).toHaveBeenCalledTimes(1));
    expect(onCommand).toHaveBeenCalledWith({
      type: "selection.move",
      ids: [annotationId],
      delta: { x: 32, y: 16 },
    });
  });
  it("aplica tamanho e cores configuradas no card de anotação", () => {
    const initial = documentWithAnnotationAndEdge();
    const annotationId = "60000000-0000-4000-8000-000000000001";
    initial.annotations[annotationId] = {
      ...initial.annotations[annotationId],
      width: 220,
      height: 72,
      properties: {
        annotationFillColor: "#fde68a",
        annotationTextColor: "#7f1d1d",
        annotationTextAlign: "right",
        annotationTextVerticalAlign: "bottom",
      },
    };
    render(<PidCanvas document={initial} catalog={localCatalog} editable onCommand={vi.fn()} />);

    const annotation = screen.getByRole("button", { name: "Anotação: Nota operacional" });
    expect(annotation).toHaveStyle({
      width: "220px",
      height: "72px",
      backgroundColor: "#fde68a",
      color: "#7f1d1d",
      textAlign: "right",
      justifyContent: "flex-end",
    });
    expect(annotation.querySelector(".pid-canvas-annotation__text")).toHaveTextContent("Nota operacional");
  });
  it("mantém card de anotação em camada menor que os outros elementos", () => {
    const initial = documentWithAnnotationAndEdge();
    render(<PidCanvas document={initial} catalog={localCatalog} editable onCommand={vi.fn()} />);

    const annotation = screen.getByRole("button", { name: "Anotação: Nota operacional" });
    expect(annotation.closest(".react-flow__viewport-portal")).toBeInTheDocument();

    const globals = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
    expect(globals).toMatch(/\.pid-canvas-flow \.react-flow__viewport-portal \{ z-index: 1; pointer-events: none; \}/);
    expect(globals).toMatch(/\.pid-canvas-flow \.react-flow__edges \{ z-index: 2; \}/);
    expect(globals).toMatch(/\.pid-canvas-flow \.react-flow__nodes \{ z-index: 3; \}/);
    expect(globals).toMatch(/\.pid-canvas-annotations \{ position: absolute; z-index: 0; inset: 0; pointer-events: none; \}/);
  });
  it("redimensiona card de anotação selecionado por alça no canvas", async () => {
    const initial = documentWithAnnotationAndEdge();
    const annotationId = "60000000-0000-4000-8000-000000000001";
    const onCommand = vi.fn();
    render(<PidCanvas document={initial} catalog={localCatalog} editable onCommand={onCommand} />);

    const annotation = screen.getByRole("button", { name: "Anotação: Nota operacional" });
    fireEvent.click(annotation);
    const handle = await screen.findByTestId(`annotation-resize-se-${annotationId}`);
    dispatchFlowPointerEvent(handle, "pointerdown", { button: 0, clientX: 300, clientY: 136 });
    dispatchFlowPointerEvent(window, "pointermove", { clientX: 332, clientY: 156 });

    await waitFor(() => {
      expect(annotation.style.width).toBe("212px");
      expect(annotation.style.height).toBe("76px");
    });
    expect(onCommand).not.toHaveBeenCalled();

    dispatchFlowPointerEvent(window, "pointerup", { button: 0, clientX: 332, clientY: 156 });
    await waitFor(() => expect(onCommand).toHaveBeenCalledWith({
      type: "element.patch",
      id: annotationId,
      patch: { width: 212, height: 76 },
    }));
  });
  it("limpa anotações na seleção simples de nó ou aresta", async () => {
    const initial = documentWithAnnotationAndEdge();
    const onSelectionChange = vi.fn();
    render(<PidCanvas document={initial} catalog={localCatalog} editable onCommand={vi.fn()} onSelectionChange={onSelectionChange} />);
    const annotation = screen.getByRole("button", { name: "Anotação: Nota operacional" });

    fireEvent.click(annotation);
    fireEvent.click(screen.getByRole("button", { name: "Bomba P-1" }));
    await waitFor(() => expect(onSelectionChange).toHaveBeenLastCalledWith({ nodeIds: [ids.pump], edgeIds: [] }));
    expect(annotation).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(annotation);
    fireEvent.click(screen.getByTestId("process-edge-40000000-0000-4000-8000-000000000001"));
    await waitFor(() => expect(onSelectionChange).toHaveBeenLastCalledWith({
      nodeIds: [], edgeIds: ["40000000-0000-4000-8000-000000000001"],
    }));
    expect(annotation).toHaveAttribute("aria-pressed", "false");
  });

  it("preserva anotação ao adicionar nó ou aresta com Ctrl/Cmd", async () => {
    const initial = documentWithAnnotationAndEdge();
    const onSelectionChange = vi.fn();
    render(<PidCanvas document={initial} catalog={localCatalog} editable onCommand={vi.fn()} onSelectionChange={onSelectionChange} />);
    const annotation = screen.getByRole("button", { name: "Anotação: Nota operacional" });
    fireEvent.click(annotation);

    fireEvent.keyDown(document, { key: "Control", code: "ControlLeft" });
    fireEvent.click(screen.getByRole("button", { name: "Bomba P-1" }), { ctrlKey: true });
    fireEvent.keyUp(document, { key: "Control", code: "ControlLeft" });
    await waitFor(() => expect(onSelectionChange).toHaveBeenLastCalledWith({
      nodeIds: [ids.pump], edgeIds: [], annotationIds: ["60000000-0000-4000-8000-000000000001"],
    }));

    fireEvent.keyDown(document, { key: "Control", code: "ControlLeft" });
    fireEvent.click(screen.getByTestId("process-edge-40000000-0000-4000-8000-000000000001"), { ctrlKey: true });
    fireEvent.keyUp(document, { key: "Control", code: "ControlLeft" });
    await waitFor(() => expect(onSelectionChange).toHaveBeenLastCalledWith({
      nodeIds: [ids.pump], edgeIds: ["40000000-0000-4000-8000-000000000001"],
      annotationIds: ["60000000-0000-4000-8000-000000000001"],
    }));
    expect(annotation).toHaveAttribute("aria-pressed", "true");
  });
  it("não clobbera a posição transiente quando outro trecho do documento muda durante o drag", async () => {
    const onCommand = vi.fn();
    const initial = interactionDocument();
    const { rerender } = render(
      <PidCanvas document={initial} catalog={localCatalog} editable onCommand={onCommand} />,
    );
    const pump = screen.getByRole("button", { name: "Bomba P-1" });
    dispatchFlowMouseEvent(pump, "mousedown", { button: 0, buttons: 1, clientX: 100, clientY: 80 });
    dispatchFlowMouseEvent(window, "mousemove", { buttons: 1, clientX: 96, clientY: 80 });
    dispatchFlowMouseEvent(window, "mousemove", { buttons: 1, clientX: 128, clientY: 112 });
    await waitFor(() => expect(pump.style.transform).toContain("132px"));
    const transientTransform = pump.style.transform;

    const unrelated = {
      ...initial,
      nodes: {
        ...initial.nodes,
        [ids.tank]: { ...initial.nodes[ids.tank], label: "Tanque atualizado" },
      },
    };
    rerender(<PidCanvas document={unrelated} catalog={localCatalog} editable onCommand={onCommand} />);
    expect(screen.getByRole("button", { name: "Bomba P-1" }).style.transform).toBe(transientTransform);
    expect(screen.getByRole("button", { name: "Tanque atualizado T-1" })).toBeInTheDocument();

    dispatchFlowMouseEvent(window, "mouseup", { button: 0, clientX: 128, clientY: 112 });
    await waitFor(() => expect(onCommand).toHaveBeenCalledTimes(1));
  });

  it("move visualmente com setas e emite um único comando canônico", async () => {
    const onCommand = vi.fn();
    render(<PidCanvas document={interactionDocument()} catalog={localCatalog} editable onCommand={onCommand} />);
    const pump = screen.getByRole("button", { name: "Bomba P-1" });
    expect(screen.getByTestId(`equipment-body-${ids.pump}`)).toHaveStyle({ top: "16px", left: "0px" });
    fireEvent.click(pump);
    pump.focus();
    fireEvent.keyDown(pump, { key: "ArrowRight", code: "ArrowRight" });

    await waitFor(() => expect(pump.style.transform).toBe("translate(101px,64px)"));
    expect(onCommand).toHaveBeenCalledTimes(1);
    expect(onCommand).toHaveBeenCalledWith({
      type: "selection.move",
      ids: [ids.pump],
      delta: { x: 1, y: 0 },
    });
  });

  it("aplica a mesma delta canônica a toda a multiseleção pelo teclado", async () => {
    const onCommand = vi.fn();
    const selection = { nodeIds: [ids.pump, ids.tank], edgeIds: [] };
    let canonical = interactionDocument();
    function Harness() {
      const [document, setDocument] = useState(canonical);
      const handleCommand = (command: PidCommand) => {
        onCommand(command);
        setDocument((current) => {
          canonical = applyCommand(current, command);
          return canonical;
        });
      };
      return <PidCanvas document={document} catalog={localCatalog} editable onCommand={handleCommand} selection={selection} onSelectionChange={vi.fn()} />;
    }
    render(<Harness />);
    const pump = screen.getByRole("button", { name: "Bomba P-1" });
    const tank = screen.getByRole("button", { name: "Tanque T-1" });
    await waitFor(() => {
      expect(pump).toHaveAttribute("aria-pressed", "true");
      expect(tank).toHaveAttribute("aria-pressed", "true");
    });
    pump.focus();
    fireEvent.keyDown(pump, { key: "ArrowRight", code: "ArrowRight" });

    await waitFor(() => {
      expect(pump.style.transform).toBe("translate(101px,64px)");
      expect(tank.style.transform).toBe("translate(361px,44px)");
    });
    expect(onCommand).toHaveBeenCalledTimes(1);
    expect(onCommand).toHaveBeenCalledWith({
      type: "selection.move",
      ids: [ids.pump, ids.tank],
      delta: { x: 1, y: 0 },
    });
    expect(canonical.nodes[ids.pump].x).toBe(101);
    expect(canonical.nodes[ids.tank].x).toBe(361);
  });

  it("redimensiona e gira equipamento selecionado com alças no canvas", async () => {
    const onCommand = vi.fn();
    render(
      <PidCanvas
        document={interactionDocument()}
        catalog={localCatalog}
        editable
        onCommand={onCommand}
        defaultSelection={{ nodeIds: [ids.pump], edgeIds: [] }}
      />,
    );

    await waitFor(() => expect(screen.getByRole("button", { name: "Bomba P-1" })).toHaveAttribute("aria-pressed", "true"));
    const resizeHandle = screen.getByTestId(`equipment-resize-se-${ids.pump}`);
    dispatchFlowMouseEvent(resizeHandle, "pointerdown", { clientX: 196, clientY: 144 });
    dispatchFlowMouseEvent(window, "pointermove", { clientX: 220, clientY: 160 });
    dispatchFlowMouseEvent(window, "pointerup", { clientX: 220, clientY: 160 });

    await waitFor(() => expect(onCommand).toHaveBeenCalledWith({
      type: "element.patch",
      id: ids.pump,
      patch: { width: 120, height: 80 },
    }));

    const rotateHandle = screen.getByTestId(`equipment-rotate-${ids.pump}`);
    dispatchFlowMouseEvent(rotateHandle, "pointerdown", { clientX: 48, clientY: 0 });
    dispatchFlowMouseEvent(window, "pointermove", { clientX: 148, clientY: 82 });
    dispatchFlowMouseEvent(window, "pointerup", { clientX: 148, clientY: 82 });

    await waitFor(() => expect(onCommand).toHaveBeenCalledWith({
      type: "element.patch",
      id: ids.pump,
      patch: { rotation: 117 },
    }));
  });

  it("ajusta a espessura da linha de processo pelas alças circulares", async () => {
    const onCommand = vi.fn();
    const document = documentWithAnnotationAndEdge();
    const edgeId = "40000000-0000-4000-8000-000000000001";
    render(
      <PidCanvas
        document={document}
        catalog={localCatalog}
        editable
        onCommand={onCommand}
        defaultSelection={{ nodeIds: [], edgeIds: [edgeId] }}
      />,
    );

    const handle = await screen.findByTestId(`process-line-width-handle-${edgeId}-0`);
    expect(screen.getAllByRole("slider", { name: /Ajustar espessura da linha de processo/i })).toHaveLength(2);
    const startX = Number(handle.getAttribute("cx"));
    const startY = Number(handle.getAttribute("cy"));
    dispatchFlowMouseEvent(handle, "pointerdown", { clientX: startX, clientY: startY });
    dispatchFlowMouseEvent(window, "pointermove", { clientX: startX, clientY: startY + 10 });
    expect(handle).toHaveAttribute("aria-valuenow", "28");
    dispatchFlowMouseEvent(window, "pointerup", { clientX: startX, clientY: startY + 10 });

    await waitFor(() => expect(onCommand).toHaveBeenCalledWith({
      type: "element.patch",
      id: edgeId,
      patch: {
        properties: {
          processLineStrokeWidth: 2,
          processLineParallelGap: 28,
        },
      },
    }));
  });

  it("conecta portas focáveis com Enter/Espaço, anuncia estados e cancela com Escape", async () => {
    const onCommand = vi.fn();
    render(<PidCanvas document={interactionDocument()} catalog={localCatalog} editable onCommand={onCommand} />);
    const source = screen.getByRole("button", { name: /saída out/i });
    const target = screen.getByRole("button", { name: /entrada in$/i });
    expect(source).toHaveAttribute("tabindex", "0");
    expect(target).toHaveAttribute("tabindex", "0");

    source.focus();
    fireEvent.keyDown(source, { key: "Enter", code: "Enter" });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/selecionada como origem/i));
    target.focus();
    fireEvent.keyDown(target, { key: " ", code: "Space" });
    await waitFor(() => expect(onCommand).toHaveBeenCalledTimes(1));
    expect(onCommand).toHaveBeenCalledWith({
      type: "ports.connect",
      sourcePortId: ids.pumpOut,
      targetPortId: ids.tankIn,
    });
    expect(screen.getByRole("status")).toHaveTextContent(/sucesso/i);

    source.focus();
    fireEvent.keyDown(source, { key: "Enter", code: "Enter" });
    const invalid = source;
    invalid.focus();
    fireEvent.keyDown(invalid, { key: "Enter", code: "Enter" });
    expect(screen.getByRole("status")).toHaveTextContent(/inválida/i);
    fireEvent.keyDown(invalid, { key: "Escape", code: "Escape" });
    expect(screen.getByRole("status")).toHaveTextContent(/cancelada/i);
    expect(onCommand).toHaveBeenCalledTimes(1);
  });

  it("mantém portas adjacentes reais independentes para conexão por ponteiro", async () => {
    const onCommand = vi.fn();
    render(<PidCanvas document={interactionDocument()} catalog={localCatalog} editable onCommand={onCommand} />);
    const processTarget = screen.getByRole("button", { name: /entrada inlet/i });
    const signalTarget = screen.getByRole("button", { name: /entrada signal/i });
    const processRect = processTarget.getBoundingClientRect();
    const signalRect = signalTarget.getBoundingClientRect();
    expect(processRect.width).toBeGreaterThanOrEqual(8);
    expect(processRect.width).toBeLessThanOrEqual(44);
    expect(signalRect.width).toBe(processRect.width);
    expect(Math.max(processRect.top, signalRect.top)).toBeGreaterThanOrEqual(
      Math.min(processRect.bottom, signalRect.bottom),
    );

    await clickConnect(screen.getByRole("button", { name: /saída out/i }), processTarget);
    await clickConnect(screen.getByRole("button", { name: /saída signal-out/i }), signalTarget);
    await clickConnect(
      screen.getByRole("button", { name: /bidirecional utility$/i }),
      screen.getByRole("button", { name: /entrada utility-in/i }),
    );
    await waitFor(() => expect(onCommand).toHaveBeenCalledTimes(3));
    expect(onCommand.mock.calls.map(([command]) => command)).toEqual([
      { type: "ports.connect", sourcePortId: ids.pumpOut, targetPortId: ids.valveIn },
      { type: "ports.connect", sourcePortId: ids.signalOut, targetPortId: ids.valveSignal },
      { type: "ports.connect", sourcePortId: ids.utility, targetPortId: ids.utilityTarget },
    ]);
  });

  it("remove interatividade das portas em leitura e usa fallback quando a imagem falha", () => {
    render(<PidCanvas document={interactionDocument()} catalog={localCatalog} editable={false} onCommand={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Criar conexão/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /Porta de/i }).every((port) => !port.hasAttribute("tabindex"))).toBe(true);
    expect(screen.getAllByText("Símbolo indisponível").length).toBeGreaterThan(0);
  });

  it("mantém seleção controlada no pai e gerencia defaultSelection apenas no modo não controlado", async () => {
    const controlledChange = vi.fn();
    const document = interactionDocument();
    const { rerender } = render(
      <PidCanvas
        document={document}
        catalog={localCatalog}
        editable
        onCommand={vi.fn()}
        selection={{ nodeIds: [ids.pump], edgeIds: [] }}
        onSelectionChange={controlledChange}
      />,
    );
    const pump = screen.getByRole("button", { name: "Bomba P-1" });
    const tank = screen.getByRole("button", { name: "Tanque T-1" });
    await waitFor(() => expect(pump).toHaveAttribute("aria-pressed", "true"));
    fireEvent.click(tank);
    await waitFor(() => expect(controlledChange).toHaveBeenCalled());
    expect(pump).toHaveAttribute("aria-pressed", "true");
    expect(tank).toHaveAttribute("aria-pressed", "false");

    const uncontrolledChange = vi.fn();
    rerender(
      <PidCanvas
        key="uncontrolled-a"
        document={document}
        catalog={localCatalog}
        editable
        onCommand={vi.fn()}
        defaultSelection={{ nodeIds: [ids.tank], edgeIds: [] }}
        onSelectionChange={uncontrolledChange}
      />,
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "Tanque T-1" })).toHaveAttribute("aria-pressed", "true"));
    fireEvent.click(screen.getByRole("button", { name: "Bomba P-1" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Bomba P-1" })).toHaveAttribute("aria-pressed", "true"));

    const pruned = { ...document, nodes: { ...document.nodes } };
    delete pruned.nodes[ids.pump];
    rerender(
      <PidCanvas
        key="uncontrolled-a"
        document={pruned}
        catalog={localCatalog}
        editable
        onCommand={vi.fn()}
        defaultSelection={{ nodeIds: [ids.tank], edgeIds: [] }}
        onSelectionChange={uncontrolledChange}
      />,
    );
    expect(screen.queryByRole("button", { name: "Bomba P-1" })).not.toBeInTheDocument();
    await waitFor(() => expect(uncontrolledChange).toHaveBeenLastCalledWith({ nodeIds: [], edgeIds: [] }));

    rerender(
      <PidCanvas
        key="uncontrolled-b"
        document={document}
        catalog={localCatalog}
        editable
        onCommand={vi.fn()}
        defaultSelection={{ nodeIds: [ids.tank], edgeIds: [] }}
        onSelectionChange={uncontrolledChange}
      />,
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "Tanque T-1" })).toHaveAttribute("aria-pressed", "true"));
  });

  it("descreve atalhos corretos nos modos editável e somente leitura", () => {
    const document = interactionDocument();
    const edgeId = "40000000-0000-4000-8000-000000000001";
    document.edges[edgeId] = {
      id: edgeId,
      sourcePortId: ids.pumpOut,
      targetPortId: ids.tankIn,
      connectionClass: "process",
      lineStyle: "supply-impulse",
      route: [],
      tag: "",
      label: "",
      properties: {},
    };
    const { rerender } = render(
      <PidCanvas document={document} catalog={localCatalog} editable onCommand={vi.fn()} />,
    );
    const editableNode = screen.getByRole("button", { name: "Bomba P-1" });
    const editableDescription = documentById(editableNode.getAttribute("aria-describedby"));
    expect(editableDescription).toMatch(/setas/i);
    expect(editableDescription).toMatch(/delete/i);
    const editableEdge = screen.getByRole("group", { name: `Conexão ${edgeId}` });
    expect(documentById(editableEdge.getAttribute("aria-describedby"))).toMatch(/delete/i);

    rerender(<PidCanvas document={document} catalog={localCatalog} editable={false} onCommand={vi.fn()} />);
    const readonlyNode = screen.getByRole("button", { name: "Bomba P-1" });
    const readonlyDescription = documentById(readonlyNode.getAttribute("aria-describedby"));
    expect(readonlyDescription).not.toMatch(/setas|mover|delete|excluir/i);
    expect(readonlyDescription).toMatch(/selecionar/i);
    const readonlyEdge = screen.getByRole("group", { name: `Conexão ${edgeId}` });
    expect(documentById(readonlyEdge.getAttribute("aria-describedby"))).not.toMatch(/delete|excluir/i);
    readonlyNode.focus();
    fireEvent.keyDown(readonlyNode, { key: "ArrowRight", code: "ArrowRight" });
    expect(readonlyNode.style.transform).toBe("translate(100px,64px)");
  });

  it("limpa a origem do teclado ao entrar em leitura ou remover a porta", async () => {
    const document = interactionDocument();
    const { rerender } = render(
      <PidCanvas document={document} catalog={localCatalog} editable onCommand={vi.fn()} />,
    );
    fireEvent.keyDown(screen.getByRole("button", { name: /saída out/i }), { key: "Enter", code: "Enter" });
    expect(screen.getByTestId("pid-canvas")).toHaveAttribute("data-keyboard-source-port", ids.pumpOut);

    rerender(<PidCanvas document={document} catalog={localCatalog} editable={false} onCommand={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId("pid-canvas")).toHaveAttribute("data-keyboard-source-port", ""));

    rerender(<PidCanvas document={document} catalog={localCatalog} editable onCommand={vi.fn()} />);
    fireEvent.keyDown(screen.getByRole("button", { name: /saída out/i }), { key: "Enter", code: "Enter" });
    const withoutSource = { ...document, ports: { ...document.ports } };
    delete withoutSource.ports[ids.pumpOut];
    rerender(<PidCanvas document={withoutSource} catalog={localCatalog} editable onCommand={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId("pid-canvas")).toHaveAttribute("data-keyboard-source-port", ""));
  });
});

describe("cache estrutural do canvas P&ID", () => {
  it("renderiza 500 nós/1000 arestas e preserva entidades não alteradas no rerender", async () => {
    const document = largeDocument();
    const symbols = new Map(localCatalog.map((symbol) => [symbol.key, symbol]));
    const onPortKey = vi.fn();
    const first = projectPidCanvasDocument(document, symbols, true, onPortKey);
    const repeated = projectPidCanvasDocument(document, symbols, true, onPortKey);
    expect(repeated.nodes[300]).toBe(first.nodes[300]);
    expect(repeated.edges[700]).toBe(first.edges[700]);
    expect(first.nodes).toHaveLength(500);
    expect(first.edges).toHaveLength(1000);
    expect(first.nodes.every((node) => node.selected === false && node.domAttributes?.["aria-pressed"] === false)).toBe(true);
    expect(first.edges.every((edge) => edge.selected === false)).toBe(true);
    const unchangedSelection = applyPidCanvasSelection(first, { nodeIds: [], edgeIds: [] });
    expect(unchangedSelection).toBe(first);
    const oneSelected = applyPidCanvasSelection(first, { nodeIds: ["node-10"], edgeIds: [] });
    expect(oneSelected.nodes.filter((node, index) => node !== first.nodes[index])).toHaveLength(1);
    expect(oneSelected.edges).toBe(first.edges);

    const changedNode = { ...document.nodes["node-10"], label: "Alterado" };
    const changedDocument = { ...document, nodes: { ...document.nodes, [changedNode.id]: changedNode } };
    const changed = projectPidCanvasDocument(changedDocument, symbols, true, onPortKey);
    expect(changed.nodes.find(({ id }) => id === "node-10")).not.toBe(first.nodes.find(({ id }) => id === "node-10"));
    expect(changed.nodes.find(({ id }) => id === "node-300")).toBe(first.nodes.find(({ id }) => id === "node-300"));
    expect(changed.edges[700]).toBe(first.edges[700]);

    const utilityCategories = [{ id: "c0000000-0000-4000-8000-000000000001", name: "Vapor", color: "#ef4444" }];
    const categorizedDocument = {
      ...document,
      metadata: { ...document.metadata, utilityCategories },
    };
    const categorized = projectPidCanvasDocument(categorizedDocument, symbols, true, onPortKey);
    expect(categorized.edges[700]).not.toBe(first.edges[700]);
    expect(categorized.edges[700].data?.utilityCategories).toBe(utilityCategories);

    const { rerender } = render(
      <StrictMode>
        <PidCanvas document={document} catalog={localCatalog} editable onCommand={vi.fn()} />
      </StrictMode>,
    );
    const stableNode = await screen.findByTestId("rf__node-node-0");
    rerender(
      <StrictMode>
        <PidCanvas
          document={document}
          catalog={localCatalog}
          editable
          onCommand={vi.fn()}
          selection={{ nodeIds: ["node-10"], edgeIds: [] }}
          onSelectionChange={vi.fn()}
        />
      </StrictMode>,
    );
    expect(await screen.findByTestId("rf__node-node-0")).toBe(stableNode);
  }, 15_000);
});

async function clickConnect(source: HTMLElement, target: HTMLElement) {
  const original = Object.getOwnPropertyDescriptor(document, "elementFromPoint");
  Object.defineProperty(document, "elementFromPoint", { configurable: true, value: () => target });
  try {
    fireEvent.click(source);
    fireEvent.click(target);
  } finally {
    if (original) Object.defineProperty(document, "elementFromPoint", original);
    else Reflect.deleteProperty(document, "elementFromPoint");
  }
}

function dispatchFlowMouseEvent(target: Element | Window, type: string, init: MouseEventInit) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...init });
  Object.defineProperty(event, "view", { value: document.defaultView });
  fireEvent(target, event);
}

function dispatchFlowPointerEvent(target: Element | Window, type: string, init: MouseEventInit) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...init });
  Object.defineProperty(event, "view", { value: document.defaultView });
  fireEvent(target, event);
}

function documentById(id: string | null): string {
  return id ? window.document.getElementById(id)?.textContent ?? "" : "";
}

function interactionDocument(): PidDocument {
  const nodes: Record<string, PidNode> = {
    [ids.pump]: makeNode(ids.pump, "drawio.pid.pumps.centrifugal-pump-1", 100, 80, 96, 64, "Bomba", "P-1"),
    [ids.tank]: makeNode(ids.tank, "drawio.pid.vessels.tank", 360, 80, 80, 72, "Tanque", "T-1"),
    [ids.valve]: makeNode(ids.valve, "drawio.pid.valves.ball-valve", 240, 240, 72, 56, "Válvula", "XV-1"),
    [ids.instrument]: makeNode(ids.instrument, "drawio.pid.instruments.flow-indicator", 480, 240, 56, 56, "Instrumento", "FI-1"),
  };
  const ports: Record<string, PidPort> = {
    [ids.pumpOut]: makePort(ids.pumpOut, ids.pump, "out", "output", "process"),
    [ids.tankIn]: makePort(ids.tankIn, ids.tank, "in", "input", "process"),
    [ids.valveIn]: makePort(ids.valveIn, ids.valve, "inlet", "input", "process"),
    [ids.valveSignal]: makePort(ids.valveSignal, ids.valve, "signal", "input", "signal"),
    [ids.signalOut]: makePort(ids.signalOut, ids.instrument, "signal-out", "output", "signal"),
    [ids.utility]: makePort(ids.utility, ids.instrument, "utility", "bidirectional", "utility"),
    [ids.utilityTarget]: makePort(ids.utilityTarget, ids.tank, "utility-in", "input", "utility"),
  };
  return makeDocument(nodes, ports, {});
}

function documentWithAnnotationAndEdge(): PidDocument {
  const document = interactionDocument();
  const annotationId = "60000000-0000-4000-8000-000000000001";
  const edgeId = "40000000-0000-4000-8000-000000000001";
  document.annotations[annotationId] = {
    id: annotationId, kind: "text", text: "Nota operacional", x: 120, y: 80,
    width: 180, height: 56, rotation: 0, properties: {},
  };
  document.edges[edgeId] = {
    id: edgeId, sourcePortId: ids.pumpOut, targetPortId: ids.tankIn,
    connectionClass: "process", lineStyle: "supply-impulse", route: [], tag: "", label: "", properties: {},
  };
  return document;
}

function largeDocument(): PidDocument {
  const nodes: Record<string, PidNode> = {};
  const ports: Record<string, PidPort> = {};
  const edges: Record<string, PidEdge> = {};
  for (let index = 0; index < 500; index += 1) {
    const id = `node-${index}`;
    nodes[id] = makeNode(id, "drawio.pid.pumps.centrifugal-pump-1", (index % 25) * 140, Math.floor(index / 25) * 100, 96, 64, "", `N-${index}`);
    ports[`in-${index}`] = makePort(`in-${index}`, id, "in", "input", "process");
    ports[`out-${index}`] = makePort(`out-${index}`, id, "out", "output", "process");
  }
  for (let index = 0; index < 1000; index += 1) {
    const target = (index + 1) % 500;
    edges[`edge-${String(index).padStart(4, "0")}`] = {
      id: `edge-${String(index).padStart(4, "0")}`,
      sourcePortId: `out-${index % 500}`,
      targetPortId: `in-${target}`,
      connectionClass: "process",
      lineStyle: "supply-impulse",
      route: [],
      tag: "",
      label: "",
      properties: {},
    };
  }
  return makeDocument(nodes, ports, edges);
}

function makeDocument(nodes: Record<string, PidNode>, ports: Record<string, PidPort>, edges: Record<string, PidEdge>): PidDocument {
  return {
    schemaVersion: 1,
    id: "10000000-0000-4000-8000-000000000001",
    metadata: {
      title: "Interações",
      standard: "free",
      catalogVersion: "local-v1",
      createdAt: "2026-08-09T00:00:00.000Z",
      updatedAt: "2026-08-09T00:00:00.000Z",
      utilityCategories: [],
    },
    nodes,
    ports,
    edges,
    annotations: {},
    groups: {},
  };
}

function makeNode(
  id: string,
  symbolKey: string,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  tag: string,
): PidNode {
  return { id, symbolKey, catalogVersion: "local-v1", x, y, width, height, rotation: 0, tag, label, properties: {} };
}

function makePort(
  id: string,
  nodeId: string,
  templateKey: string,
  direction: PidPort["direction"],
  connectionClass: PidPort["connectionClass"],
): PidPort {
  return { id, nodeId, templateKey, direction, connectionClass, capacity: 10 };
}
