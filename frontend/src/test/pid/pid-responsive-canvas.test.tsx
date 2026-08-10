import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { PidServices } from "@/features/pid/api/contracts";
import { PidServicesProvider } from "@/features/pid/api/pid-services";
import type { PidDocument } from "@/features/pid/domain/model";
import { PidEditorPage } from "@/features/pid/editor/pid-editor-page";
import { installPidCanvasGeometryHarness } from "./pid-canvas-harness";

const ids = {
  diagram: "92000000-0000-4000-8000-000000000001",
  pump: "92000000-0000-4000-8000-000000000002",
  tank: "92000000-0000-4000-8000-000000000003",
  out: "92000000-0000-4000-8000-000000000004",
  input: "92000000-0000-4000-8000-000000000005",
} as const;
let restoreCanvasGeometry: () => void;
let originalInnerWidth: PropertyDescriptor | undefined;

beforeAll(() => {
  restoreCanvasGeometry = installPidCanvasGeometryHarness();
  originalInnerWidth = Object.getOwnPropertyDescriptor(window, "innerWidth");
});
afterAll(() => {
  restoreCanvasGeometry();
  if (originalInnerWidth) Object.defineProperty(window, "innerWidth", originalInnerWidth);
});
beforeEach(() => setWidth(375));

describe("canvas real sob capability responsiva", () => {
  it("preserva pan/zoom em 375 e habilita drag, conexão e exclusão em 768", async () => {
    const pidServices = services();
    const { container } = mount(pidServices);
    const pump = await screen.findByRole("button", { name: "Bomba P-1" });
    const viewport = container.querySelector<HTMLElement>(".react-flow__viewport")!;
    const pane = container.querySelector<HTMLElement>(".react-flow__pane")!;
    await waitFor(() => expect(viewport.style.transform).not.toBe(""));

    expect(screen.getByTestId("pid-canvas")).toHaveAttribute("data-editable", "false");
    const beforeZoom = viewport.style.transform;
    fireEvent.click(screen.getByRole("button", { name: "Aumentar zoom" }));
    await waitFor(() => expect(viewport.style.transform).not.toBe(beforeZoom));
    const beforePan = viewport.style.transform;
    dispatchFlowMouseEvent(pane, "mousedown", { button: 0, buttons: 1, clientX: 400, clientY: 280 });
    dispatchFlowMouseEvent(window, "mousemove", { buttons: 1, clientX: 448, clientY: 312 });
    dispatchFlowMouseEvent(window, "mouseup", { button: 0, clientX: 448, clientY: 312 });
    await waitFor(() => expect(viewport.style.transform).not.toBe(beforePan));

    const readonlyNodePosition = pump.style.transform;
    dispatchFlowMouseEvent(pump, "mousedown", { button: 0, buttons: 1, clientX: 100, clientY: 80 });
    dispatchFlowMouseEvent(window, "mousemove", { buttons: 1, clientX: 132, clientY: 112 });
    dispatchFlowMouseEvent(window, "mouseup", { button: 0, clientX: 132, clientY: 112 });
    fireEvent.click(pump);
    fireEvent.keyDown(pump, { key: "Delete", code: "Delete" });
    expect(pump.style.transform).toBe(readonlyNodePosition);
    expect(screen.getByRole("button", { name: "Bomba P-1" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /saída out/i })).not.toBeInTheDocument();
    expect(pidServices.document.save).not.toHaveBeenCalled();

    resize(768);
    await waitFor(() => expect(screen.getByTestId("pid-canvas")).toHaveAttribute("data-editable", "true"));
    const editablePump = screen.getByRole("button", { name: "Bomba P-1" });
    const beforeDrag = editablePump.style.transform;
    dispatchFlowMouseEvent(editablePump, "mousedown", { button: 0, buttons: 1, clientX: 100, clientY: 80 });
    dispatchFlowMouseEvent(window, "mousemove", { buttons: 1, clientX: 132, clientY: 112 });
    dispatchFlowMouseEvent(window, "mouseup", { button: 0, clientX: 132, clientY: 112 });
    await waitFor(() => expect(editablePump.style.transform).not.toBe(beforeDrag));

    const source = screen.getByRole("button", { name: /saída out/i });
    const target = screen.getByRole("button", { name: /entrada in/i });
    fireEvent.keyDown(source, { key: "Enter", code: "Enter" });
    fireEvent.keyDown(target, { key: "Enter", code: "Enter" });
    await waitFor(() => expect(screen.getByTestId(/process-edge-/)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Tanque T-1" }));
    fireEvent.click(screen.getByRole("button", { name: "Excluir seleção" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Tanque T-1" })).not.toBeInTheDocument());
  });
});

function mount(pidServices: PidServices) {
  const router = createMemoryRouter([{ path: "/pid/:diagramId", element: <PidEditorPage /> }], {
    initialEntries: [`/pid/${ids.diagram}#access=edit-token`],
  });
  return render(<PidServicesProvider services={pidServices}><RouterProvider router={router} /></PidServicesProvider>);
}

function services(): PidServices {
  return {
    document: {
      create: vi.fn(),
      open: vi.fn().mockResolvedValue({ scope: "edit", document: documentFixture(), revision: 1 }),
      save: vi.fn().mockImplementation(async (_id, _token, _document, revision) => revision + 1),
      regenerate: vi.fn(), softDelete: vi.fn(), restore: vi.fn(),
    },
    catalog: { list: vi.fn() }, collaboration: { connect: vi.fn() },
  };
}

function documentFixture(): PidDocument {
  return {
    schemaVersion: 1,
    id: ids.diagram,
    metadata: { title: "Canvas responsivo", standard: "free", catalogVersion: "local-v1", createdAt: "2026-08-09T00:00:00.000Z", updatedAt: "2026-08-09T00:00:00.000Z" },
    nodes: {
      [ids.pump]: { id: ids.pump, symbolKey: "drawio.pid.pumps.centrifugal-pump-1", catalogVersion: "local-v1", x: 100, y: 80, width: 96, height: 64, rotation: 0, tag: "P-1", label: "Bomba", properties: {} },
      [ids.tank]: { id: ids.tank, symbolKey: "drawio.pid.vessels.tank", catalogVersion: "local-v1", x: 360, y: 80, width: 80, height: 72, rotation: 0, tag: "T-1", label: "Tanque", properties: {} },
    },
    ports: {
      [ids.out]: { id: ids.out, nodeId: ids.pump, templateKey: "out", direction: "output", connectionClass: "process", capacity: 1 },
      [ids.input]: { id: ids.input, nodeId: ids.tank, templateKey: "in", direction: "input", connectionClass: "process", capacity: 1 },
    },
    edges: {}, annotations: {}, groups: {},
  };
}

function setWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
}

function resize(width: number) {
  act(() => { setWidth(width); window.dispatchEvent(new Event("resize")); });
}

function dispatchFlowMouseEvent(target: Element | Window, type: string, init: MouseEventInit) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...init });
  Object.defineProperty(event, "view", { value: document.defaultView });
  fireEvent(target, event);
}
