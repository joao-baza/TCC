import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { StrictMode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  createPidMoveCommand,
  isPidConnectionValid,
  normalizePidConnection,
  PidCanvas,
  pidConnectionCommand,
} from "@/features/pid/canvas/pid-canvas";
import { createCatalogIndex } from "@/features/pid/catalog/catalog-index";
import { localCatalog } from "@/features/pid/catalog/fixtures/catalog";
import type { PidDocument } from "@/features/pid/domain/model";
import { orthogonalPath } from "@/features/pid/canvas/process-edge";
import { getPidCanvasInteractionGeometry } from "@/features/pid/canvas/port-hit-target";
import { getPidNodeGeometry, getPidPortAnchorGeometry } from "@/features/pid/domain/geometry";
import { installPidCanvasGeometryHarness } from "./pid-canvas-harness";

let restoreCanvasGeometry: () => void;
beforeAll(() => { restoreCanvasGeometry = installPidCanvasGeometryHarness(); });
afterAll(() => restoreCanvasGeometry());

const ids = {
  document: "10000000-0000-4000-8000-000000000001",
  pump: "20000000-0000-4000-8000-000000000002",
  suction: "30000000-0000-4000-8000-000000000003",
  discharge: "30000000-0000-4000-8000-000000000004",
  tank: "20000000-0000-4000-8000-000000000005",
  tankInlet: "30000000-0000-4000-8000-000000000006",
  tankOutlet: "30000000-0000-4000-8000-000000000007",
  utility: "30000000-0000-4000-8000-000000000008",
  instrument: "20000000-0000-4000-8000-000000000009",
  bidirectional: "30000000-0000-4000-8000-000000000010",
  edge: "40000000-0000-4000-8000-000000000011",
  auxiliary: "30000000-0000-4000-8000-000000000012",
} as const;

function dispatchFlowMouseEvent(target: Element | Window, type: string, init: MouseEventInit) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...init });
  Object.defineProperty(event, "view", { value: document.defaultView });
  fireEvent(target, event);
}

function pumpDocument(): PidDocument {
  return {
    schemaVersion: 1,
    id: ids.document,
    metadata: {
      title: "Unidade 100",
      standard: "free",
      catalogVersion: "local-v1",
      createdAt: "2026-08-09T12:00:00.000Z",
      updatedAt: "2026-08-09T12:00:00.000Z",
    },
    nodes: {
      [ids.pump]: {
        id: ids.pump,
        symbolKey: "drawio.pid.pumps.centrifugal-pump-1",
        catalogVersion: "local-v1",
        x: 100,
        y: 80,
        width: 96,
        height: 64,
        rotation: 0,
        tag: "P-101",
        label: "Bomba",
        properties: {},
      },
    },
    ports: {
      [ids.suction]: {
        id: ids.suction,
        nodeId: ids.pump,
        templateKey: "suction",
        direction: "input",
        connectionClass: "process",
        capacity: 1,
      },
      [ids.discharge]: {
        id: ids.discharge,
        nodeId: ids.pump,
        templateKey: "discharge",
        direction: "output",
        connectionClass: "process",
        capacity: 1,
      },
    },
    edges: {},
    annotations: {},
    groups: {},
  };
}

function connectionDocument(): PidDocument {
  const document = pumpDocument();
  document.ports[ids.discharge].capacity = 2;
  document.nodes[ids.tank] = {
    ...document.nodes[ids.pump],
    id: ids.tank,
    symbolKey: "drawio.pid.vessels.tank",
    x: 360,
    label: "Tanque",
    tag: "T-101",
  };
  document.nodes[ids.instrument] = {
    ...document.nodes[ids.pump],
    id: ids.instrument,
    symbolKey: "drawio.pid.instruments.flow-indicator",
    x: 620,
    label: "Indicador",
    tag: "FI-101",
  };
  document.ports[ids.tankInlet] = {
    id: ids.tankInlet,
    nodeId: ids.tank,
    templateKey: "inlet",
    direction: "input",
    connectionClass: "process",
    capacity: 2,
  };
  document.ports[ids.tankOutlet] = {
    id: ids.tankOutlet,
    nodeId: ids.tank,
    templateKey: "outlet",
    direction: "output",
    connectionClass: "process",
    capacity: 1,
  };
  document.ports[ids.utility] = {
    id: ids.utility,
    nodeId: ids.tank,
    templateKey: "utility",
    direction: "input",
    connectionClass: "utility",
    capacity: 1,
  };
  document.ports[ids.bidirectional] = {
    id: ids.bidirectional,
    nodeId: ids.instrument,
    templateKey: "process",
    direction: "bidirectional",
    connectionClass: "process",
    capacity: 2,
  };
  return document;
}

function emptyGraph(document: PidDocument): PidDocument {
  return { ...document, nodes: {}, ports: {}, edges: {} };
}

function pathPoints(path: string): Array<{ x: number; y: number }> {
  return [...path.matchAll(/[ML]\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g)]
    .map((match) => ({ x: Number(match[1]), y: Number(match[2]) }));
}

function expectAxisAligned(points: readonly { x: number; y: number }[]) {
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    expect(current.x === previous.x || current.y === previous.y).toBe(true);
    expect(current).not.toEqual(previous);
  }
}

describe("PidCanvas", () => {
  it("projeta equipamento com o mesmo ativo sanitizado usado pela exportação", async () => {
    const onCommand = vi.fn();
    const source = '<svg viewBox="0 0 120 80"><circle cx="60" cy="40" r="20" fill="none" stroke="currentColor"/></svg>';
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, text: async () => source } as Response);

    try {
      render(
        <PidCanvas
          document={pumpDocument()}
          catalog={localCatalog}
          editable
          onCommand={onCommand}
        />,
      );

      const node = screen.getByRole("button", { name: /Bomba P-101/i });
      const body = screen.getByTestId(`equipment-body-${ids.pump}`);
      const label = screen.getByTestId(`equipment-label-${ids.pump}`);

      await waitFor(() => expect(node.querySelector("img")?.getAttribute("src")).toMatch(/^data:image\/svg\+xml/));
      expect(node.querySelector("img")).toHaveAttribute("draggable", "false");
      expect(body).not.toHaveClass("border", "bg-white", "shadow-sm", "rounded-lg", "p-2");
      expect(body).not.toHaveClass("outline-blue-600");
      expect(label).toHaveClass("opacity-0");
      const outputHandle = screen.getByLabelText(/Criar conexão pela porta de saída/i);
      expect(outputHandle).toHaveClass("!border-transparent");
      expect(outputHandle).toHaveStyle({ width: "44px", height: "44px" });
      expect(outputHandle).toHaveClass("after:size-2", "after:border", "after:border-slate-700");

      fireEvent.click(node);

      expect(label).toHaveClass("opacity-100");
      expect(body).toHaveClass("outline", "outline-2", "outline-blue-600");
      expect(screen.getByTestId("pid-canvas")).toHaveAttribute("data-editable", "true");
      expect(node).toHaveAttribute("aria-pressed", "true");
    } finally {
      fetchMock.mockRestore();
    }
  });

  it("mantém indicadores de porta no modo leitura sem ação para criar conexão", () => {
    render(
      <PidCanvas
        document={pumpDocument()}
        catalog={localCatalog}
        editable={false}
        onCommand={vi.fn()}
      />,
    );

    expect(screen.getAllByText(/Porta de (entrada|saída)/i)).toHaveLength(2);
    expect(screen.queryByLabelText(/Criar conexão/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("pid-canvas")).toHaveAttribute("data-editable", "false");
  });

  it("aceita um CatalogIndex e degrada de forma tipada quando o símbolo não existe", () => {
    const document = pumpDocument();
    document.nodes[ids.pump].symbolKey = "project.missing.symbol";

    render(
      <PidCanvas
        document={document}
        catalog={createCatalogIndex(localCatalog)}
        editable={false}
        onCommand={vi.fn()}
      />,
    );

    expect(screen.getByText("Símbolo indisponível")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Bomba P-101/i })).toBeInTheDocument();
  });

  it("normaliza a ordem das alças e produz exclusivamente o comando canônico ports.connect", () => {
    const document = connectionDocument();
    const reversed = normalizePidConnection(document, {
      sourceHandle: ids.tankInlet,
      targetHandle: ids.discharge,
    });

    expect(reversed).toEqual({ sourcePortId: ids.discharge, targetPortId: ids.tankInlet });
    expect(pidConnectionCommand(document, {
      sourceHandle: ids.tankInlet,
      targetHandle: ids.discharge,
    })).toEqual({ type: "ports.connect", sourcePortId: ids.discharge, targetPortId: ids.tankInlet });
    expect(pidConnectionCommand(document, { sourceHandle: null, targetHandle: ids.tankInlet })).toBeNull();
  });

  it("emite ports.connect pelo caminho real de clique entre Handles do React Flow", async () => {
    const onCommand = vi.fn();
    render(<PidCanvas document={connectionDocument()} catalog={localCatalog} editable onCommand={onCommand} />);
    const target = screen.getByLabelText(/Criar conexão pela porta de entrada inlet/i);
    const originalElementFromPoint = Object.getOwnPropertyDescriptor(document, "elementFromPoint");
    Object.defineProperty(document, "elementFromPoint", { configurable: true, value: () => target });

    try {
      fireEvent.click(screen.getByLabelText(/Criar conexão pela porta de saída discharge/i));
      fireEvent.click(target);
    } finally {
      if (originalElementFromPoint) Object.defineProperty(document, "elementFromPoint", originalElementFromPoint);
      else Reflect.deleteProperty(document, "elementFromPoint");
    }

    await waitFor(() => expect(onCommand).toHaveBeenCalledTimes(1));
    expect(onCommand).toHaveBeenCalledWith({
      type: "ports.connect",
      sourcePortId: ids.discharge,
      targetPortId: ids.tankInlet,
    });
  });

  it("impede conexão cuja classe não corresponde à ferramenta de linha ativa", async () => {
    const onCommand = vi.fn();
    render(<PidCanvas document={connectionDocument()} catalog={localCatalog} editable onCommand={onCommand} activeConnectionClass="signal" />);
    const target = screen.getByLabelText(/Criar conexão pela porta de entrada inlet/i);
    const originalElementFromPoint = Object.getOwnPropertyDescriptor(document, "elementFromPoint");
    Object.defineProperty(document, "elementFromPoint", { configurable: true, value: () => target });
    try {
      fireEvent.click(screen.getByLabelText(/Criar conexão pela porta de saída discharge/i));
      fireEvent.click(target);
    } finally {
      if (originalElementFromPoint) Object.defineProperty(document, "elementFromPoint", originalElementFromPoint);
      else Reflect.deleteProperty(document, "elementFromPoint");
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onCommand).not.toHaveBeenCalled();
  });

  it("valida ausência, identidade, nó, direção, classe, capacidade, duplicidade e bidirecionalidade", () => {
    const document = connectionDocument();

    expect(isPidConnectionValid(document, "missing", ids.tankInlet)).toBe(false);
    expect(isPidConnectionValid(document, ids.discharge, ids.discharge)).toBe(false);
    expect(isPidConnectionValid(document, ids.discharge, ids.suction)).toBe(false);
    expect(isPidConnectionValid(document, ids.discharge, ids.tankOutlet)).toBe(false);
    expect(isPidConnectionValid(document, ids.suction, ids.tankInlet)).toBe(false);
    expect(isPidConnectionValid(document, ids.discharge, ids.utility)).toBe(false);
    expect(isPidConnectionValid(document, ids.discharge, ids.tankInlet)).toBe(true);
    expect(isPidConnectionValid(document, ids.discharge, ids.bidirectional)).toBe(true);
    expect(isPidConnectionValid(document, ids.bidirectional, ids.tankInlet)).toBe(true);

    document.edges[ids.edge] = {
      id: ids.edge,
      sourcePortId: ids.discharge,
      targetPortId: ids.tankInlet,
      connectionClass: "process",
      route: [],
      tag: "",
      label: "",
      properties: {},
    };
    expect(isPidConnectionValid(document, ids.discharge, ids.tankInlet)).toBe(false);
    document.ports[ids.discharge].capacity = 1;
    expect(isPidConnectionValid(document, ids.discharge, ids.bidirectional)).toBe(false);
  });

  it("emite um único delta canônico para todos os nós selecionados no fim do drag", () => {
    const document = connectionDocument();

    expect(createPidMoveCommand(document, ids.pump, { x: 132, y: 112 }, [ids.pump, ids.tank])).toEqual({
      type: "selection.move",
      ids: [ids.pump, ids.tank],
      delta: { x: 32, y: 32 },
    });
    expect(createPidMoveCommand(document, ids.pump, { x: 100, y: 80 }, [ids.pump])).toBeNull();
  });

  it("emite um único selection.move pelo drag real do React Flow", async () => {
    const onCommand = vi.fn();
    render(<PidCanvas document={pumpDocument()} catalog={localCatalog} editable onCommand={onCommand} />);
    const pump = screen.getByRole("button", { name: /Bomba P-101/i });

    dispatchFlowMouseEvent(pump, "mousedown", { button: 0, buttons: 1, clientX: 100, clientY: 80 });
    dispatchFlowMouseEvent(window, "mousemove", { buttons: 1, clientX: 96, clientY: 80 });
    dispatchFlowMouseEvent(window, "mousemove", { buttons: 1, clientX: 128, clientY: 112 });
    await waitFor(() => expect(pump.style.transform).toBe("translate(128px,96px)"));
    expect(onCommand).not.toHaveBeenCalled();
    dispatchFlowMouseEvent(window, "mouseup", { button: 0, clientX: 128, clientY: 112 });

    await waitFor(() => expect(onCommand).toHaveBeenCalledTimes(1));
    expect(onCommand).toHaveBeenCalledWith({
      type: "selection.move",
      ids: [ids.pump],
      delta: { x: 28, y: 32 },
    });
  });

  it("arrasta a multiseleção real sem duplicar selection.move", async () => {
    const onCommand = vi.fn();
    render(<PidCanvas document={connectionDocument()} catalog={localCatalog} editable onCommand={onCommand} />);
    const pump = screen.getByRole("button", { name: /Bomba P-101/i });
    const tank = screen.getByRole("button", { name: /Tanque T-101/i });
    fireEvent.click(pump);
    fireEvent.keyDown(window, { key: "Control", code: "ControlLeft" });
    fireEvent.click(tank, { ctrlKey: true });
    fireEvent.keyUp(window, { key: "Control", code: "ControlLeft" });

    dispatchFlowMouseEvent(pump, "mousedown", { button: 0, buttons: 1, clientX: 100, clientY: 80 });
    dispatchFlowMouseEvent(window, "mousemove", { buttons: 1, clientX: 96, clientY: 80 });
    dispatchFlowMouseEvent(window, "mousemove", { buttons: 1, clientX: 128, clientY: 112 });
    dispatchFlowMouseEvent(window, "mouseup", { button: 0, clientX: 128, clientY: 112 });

    await waitFor(() => expect(onCommand).toHaveBeenCalledTimes(1));
    expect(onCommand).toHaveBeenCalledWith({
      type: "selection.move",
      ids: [ids.pump, ids.tank],
      delta: { x: 28, y: 32 },
    });
  });

  it("emite exclusão real apenas no modo editável", async () => {
    const editableCommand = vi.fn();
    const { unmount } = render(
      <PidCanvas document={pumpDocument()} catalog={localCatalog} editable onCommand={editableCommand} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Bomba P-101/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Bomba P-101/i })).toHaveAttribute("aria-pressed", "true"));
    fireEvent.keyDown(document, { key: "Delete", code: "Delete" });
    await waitFor(() => expect(editableCommand).toHaveBeenCalledTimes(1));
    expect(editableCommand).toHaveBeenCalledWith({ type: "selection.delete", ids: [ids.pump] });
    unmount();

    const readOnlyCommand = vi.fn();
    render(<PidCanvas document={pumpDocument()} catalog={localCatalog} editable={false} onCommand={readOnlyCommand} />);
    fireEvent.click(screen.getByRole("button", { name: /Bomba P-101/i }));
    fireEvent.keyDown(document, { key: "Delete", code: "Delete" });
    expect(readOnlyCommand).not.toHaveBeenCalled();
  });

  it("preserva o documento, informa seleção apenas pelo callback e não emite comando ao selecionar", () => {
    const document = pumpDocument();
    const snapshot = structuredClone(document);
    const onCommand = vi.fn();
    const onSelectionChange = vi.fn();
    render(
      <PidCanvas
        document={document}
        catalog={localCatalog}
        editable
        onCommand={onCommand}
        onSelectionChange={onSelectionChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Bomba P-101/i }));

    expect(onSelectionChange).toHaveBeenLastCalledWith({ nodeIds: [ids.pump], edgeIds: [] });
    expect(onCommand).not.toHaveBeenCalled();
    expect(document).toEqual(snapshot);
  });

  it("notifica seleção uma vez no StrictMode e poda IDs ausentes em uma substituição", async () => {
    const document = connectionDocument();
    document.edges[ids.edge] = {
      id: ids.edge,
      sourcePortId: ids.discharge,
      targetPortId: ids.tankInlet,
      connectionClass: "process",
      route: [],
      tag: "L-101",
      label: "Produto",
      properties: {},
    };
    const onSelectionChange = vi.fn();
    const { rerender } = render(
      <StrictMode>
        <PidCanvas
          document={document}
          catalog={localCatalog}
          editable
          onCommand={vi.fn()}
          onSelectionChange={onSelectionChange}
        />
      </StrictMode>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Bomba P-101/i }));
    fireEvent.keyDown(window, { key: "Control", code: "ControlLeft" });
    fireEvent.click(await screen.findByRole("group", { name: /L-101 Produto/i }), { ctrlKey: true });
    fireEvent.keyUp(window, { key: "Control", code: "ControlLeft" });
    await waitFor(() => expect(onSelectionChange).toHaveBeenLastCalledWith({
      nodeIds: [ids.pump],
      edgeIds: [ids.edge],
    }));
    expect(onSelectionChange).toHaveBeenCalledTimes(2);
    onSelectionChange.mockClear();

    rerender(
      <StrictMode>
        <PidCanvas
          document={emptyGraph(document)}
          catalog={localCatalog}
          editable
          onCommand={vi.fn()}
          onSelectionChange={onSelectionChange}
        />
      </StrictMode>,
    );

    await waitFor(() => expect(onSelectionChange).toHaveBeenCalledWith({ nodeIds: [], edgeIds: [] }));
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
  });

  it("desenha rota Manhattan por waypoints arbitrários sem segmentos diagonais ou nulos", async () => {
    const document = connectionDocument();
    document.edges[ids.edge] = {
      id: ids.edge,
      sourcePortId: ids.discharge,
      targetPortId: ids.tankInlet,
      connectionClass: "process",
      route: [{ x: 240, y: 180 }, { x: 240, y: 180 }, { x: 300, y: 140 }],
      tag: "L-101",
      label: "Produto",
      properties: {},
    };

    render(<PidCanvas document={document} catalog={localCatalog} editable onCommand={vi.fn()} />);

    expect(await screen.findByText("L-101 Produto")).toBeInTheDocument();
    const rendered = screen.getByTestId(`process-edge-${ids.edge}`).getAttribute("d") ?? "";
    expectAxisAligned(pathPoints(rendered));
    const path = orthogonalPath(
      { x: 196, y: 112 },
      document.edges[ids.edge].route,
      { x: 360, y: 112 },
    );
    const points = pathPoints(path);
    expectAxisAligned(points);
    expect(points).toEqual(expect.arrayContaining([
      { x: 240, y: 180 },
      { x: 300, y: 140 },
      { x: 360, y: 112 },
    ]));
    expect(pathPoints(orthogonalPath(
      { x: 5, y: 5 },
      [{ x: 5, y: 5 }, { x: 5, y: 5 }],
      { x: 5, y: 5 },
    ))).toEqual([{ x: 5, y: 5 }]);
  });

  it.each([
    [0, "left", "rotate(0deg)"],
    [90, "top", "rotate(90deg)"],
    [180, "right", "rotate(180deg)"],
    [270, "bottom", "rotate(270deg)"],
  ] as const)("rotaciona somente a arte e move a porta assimétrica em %i°", async (
    rotation,
    position,
    artworkTransform,
  ) => {
    const document = pumpDocument();
    document.nodes[ids.pump].rotation = rotation;
    document.ports[ids.auxiliary] = {
      ...document.ports[ids.suction],
      id: ids.auxiliary,
      templateKey: "auxiliary",
    };
    render(<PidCanvas document={document} catalog={localCatalog} editable onCommand={vi.fn()} />);

    const nodePorts = Object.values(document.ports).filter(({ nodeId }) => nodeId === ids.pump);
    const portIndex = nodePorts.findIndex(({ id }) => id === ids.suction);
    const geometry = getPidNodeGeometry(document.nodes[ids.pump]);
    const interaction = getPidCanvasInteractionGeometry(geometry, nodePorts);
    const anchor = getPidPortAnchorGeometry(geometry, document.ports[ids.suction], portIndex, nodePorts);
    const handle = screen.getByLabelText(/Criar conexão pela porta de entrada suction/i);
    expect(handle).toHaveAttribute("data-handlepos", position);
    expect(Number.parseFloat(handle.style.left)).toBeCloseTo(interaction.canonicalRect.x + anchor.x);
    expect(Number.parseFloat(handle.style.top)).toBeCloseTo(interaction.canonicalRect.y + anchor.y);
    expect(handle.style.transform).toBe("translate(-50%, -50%)");
    expect(screen.getByTestId(`equipment-artwork-${ids.pump}`)).toHaveStyle({ transform: artworkTransform });
    expect(screen.getByTestId(`equipment-label-${ids.pump}`)).not.toHaveAttribute("style");
    expect(screen.getByTestId(`equipment-tag-${ids.pump}`)).toHaveTextContent("P-101");
  });

  it("mantém os módulos de domínio livres de React e @xyflow/react", () => {
    const domainRoot = resolve(process.cwd(), "src/features/pid/domain");
    for (const file of ["model.ts", "projection.ts", "geometry.ts", "graph-operations.ts", "commands.ts", "command-reducers.ts"]) {
      const source = readFileSync(resolve(domainRoot, file), "utf8");
      expect(source).not.toMatch(/@xyflow\/react|from ["']react["']/);
    }
  });
});
