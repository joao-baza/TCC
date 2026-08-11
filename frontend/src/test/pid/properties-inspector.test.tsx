import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type { PidServices } from "@/features/pid/api/contracts";
import { PidServicesProvider } from "@/features/pid/api/pid-services";
import { PropertiesInspector } from "@/features/pid/editor/properties-inspector";
import { PidEditorPage } from "@/features/pid/editor/pid-editor-page";
import { ValidationPanel } from "@/features/pid/editor/validation-panel";
import type { PidDocument } from "@/features/pid/domain/model";
import type { ValidationIssue } from "@/features/pid/domain/validation";

const ids = {
  document: "10000000-0000-4000-8000-000000000001",
  node: "20000000-0000-4000-8000-000000000001",
  port: "30000000-0000-4000-8000-000000000001",
  edge: "40000000-0000-4000-8000-000000000001",
  annotation: "50000000-0000-4000-8000-000000000001",
  group: "60000000-0000-4000-8000-000000000001",
} as const;

describe("inspetor contextual P&ID", () => {
  it("mostra metadados do documento quando não há seleção", () => {
    render(<PropertiesInspector document={documentFixture()} selection={[]} editable onCommand={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Inspetor" })).toBeInTheDocument();
    expect(screen.getByText("Documento de teste")).toBeInTheDocument();
    expect(screen.getByText("Livre no documento")).toBeInTheDocument();
    expect(screen.getByText(/1 equipamento/i)).toBeInTheDocument();
  });

  it.each([
    ["nó", ids.node, "Rótulo", "Bomba nova", { label: "Bomba nova" }],
    ["porta", ids.port, "Capacidade", "3", { capacity: 3 }],
    ["aresta", ids.edge, "Tag", "L-99", { tag: "L-99" }],
    ["grupo", ids.group, "Rótulo", "Unidade 200", { label: "Unidade 200" }],
    ["anotação", ids.annotation, "Texto", "Nota atualizada", { text: "Nota atualizada" }],
  ])("edita %s no blur emitindo o comando canônico", (_kind, selectedId, label, value, patch) => {
    const onCommand = vi.fn();
    render(<PropertiesInspector document={documentFixture()} selection={[selectedId]} editable onCommand={onCommand} />);

    const field = screen.getByLabelText(label);
    fireEvent.change(field, { target: { value } });
    fireEvent.blur(field);

    expect(onCommand).toHaveBeenCalledWith({ type: "element.patch", id: selectedId, patch });
  });

  it("lista somente rótulos canônicos no estilo de linha da aresta", () => {
    render(<PropertiesInspector document={documentFixture()} selection={[ids.edge]} editable onCommand={vi.fn()} />);

    const lineStyle = screen.getByRole("combobox", { name: "Estilo de linha" });
    expect(lineStyle).toHaveTextContent("Sinal elétrico");
    expect(lineStyle).not.toHaveTextContent("Contínua grossa");
  });

  it("não aplica seletor de estilo em aresta de utilidade", () => {
    const document = documentFixture();
    document.metadata.utilityCategories = [{ id: "c0000000-0000-4000-8000-000000000001", name: "Vapor", color: "#ef4444" }];
    document.edges[ids.edge] = {
      ...document.edges[ids.edge],
      connectionClass: "utility",
      lineStyle: "pneumatic-signal",
      utilityCategoryId: "c0000000-0000-4000-8000-000000000001",
    };

    render(<PropertiesInspector document={document} selection={[ids.edge]} editable onCommand={vi.fn()} />);

    expect(screen.queryByRole("combobox", { name: "Estilo de linha" })).not.toBeInTheDocument();
    expect(screen.getByText("Liso normal")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Categoria" })).toHaveValue("c0000000-0000-4000-8000-000000000001");
  });

  it("aplica categoria de utilidade imediatamente no select", () => {
    const onCommand = vi.fn();
    const document = documentFixture();
    document.metadata.utilityCategories = [{ id: "c0000000-0000-4000-8000-000000000001", name: "Vapor", color: "#ef4444" }];
    document.edges[ids.edge] = {
      ...document.edges[ids.edge],
      connectionClass: "utility",
      utilityCategoryId: undefined,
    };

    render(<PropertiesInspector document={document} selection={[ids.edge]} editable onCommand={onCommand} />);

    fireEvent.change(screen.getByRole("combobox", { name: "Categoria" }), {
      target: { value: "c0000000-0000-4000-8000-000000000001" },
    });

    expect(onCommand).toHaveBeenCalledWith({
      type: "element.patch",
      id: ids.edge,
      patch: { utilityCategoryId: "c0000000-0000-4000-8000-000000000001" },
    });
  });

  it("aceita rotação livre em graus no inspetor", () => {
    const onCommand = vi.fn();
    render(<PropertiesInspector document={documentFixture()} selection={[ids.node]} editable onCommand={onCommand} />);

    const rotation = screen.getByLabelText("Rotação");
    fireEvent.change(rotation, { target: { value: "37.5" } });
    fireEvent.blur(rotation);

    expect(onCommand).toHaveBeenCalledWith({ type: "element.patch", id: ids.node, patch: { rotation: 37.5 } });
    expect(rotation).toHaveAttribute("aria-invalid", "false");
  });

  it("valida o campo antes do comando e anuncia erros locais e do domínio", () => {
    const onCommand = vi.fn();
    const { rerender } = render(
      <PropertiesInspector document={documentFixture()} selection={[ids.port]} editable onCommand={onCommand} />,
    );
    const capacity = screen.getByLabelText("Capacidade");
    fireEvent.change(capacity, { target: { value: "0" } });
    fireEvent.blur(capacity);

    expect(onCommand).not.toHaveBeenCalled();
    expect(screen.getAllByText(/inteiro positivo/i).length).toBeGreaterThanOrEqual(1);

    rerender(<PropertiesInspector document={documentFixture()} selection={[ids.port]} editable onCommand={() => ({ ok: false, field: "capacity", message: "A capacidade foi excedida." })} />);
    const updatedCapacity = screen.getByLabelText("Capacidade");
    fireEvent.change(updatedCapacity, { target: { value: "2" } });
    fireEvent.blur(updatedCapacity);
    expect(screen.getAllByText("A capacidade foi excedida.").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("fica somente leitura quando a capability de edição está desabilitada", () => {
    render(<PropertiesInspector document={documentFixture()} selection={[ids.node]} editable={false} onCommand={vi.fn()} />);
    expect(screen.getByLabelText("Rótulo")).toBeDisabled();
    expect(screen.getByText(/somente leitura/i)).toBeInTheDocument();
  });

  it("explica seleção múltipla sem editar um elemento arbitrário", () => {
    render(<PropertiesInspector document={documentFixture()} selection={[ids.node, ids.edge]} editable onCommand={vi.fn()} />);
    expect(screen.getByText(/2 elementos selecionados/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Rótulo")).not.toBeInTheDocument();
  });

  it("não espalha a prop reservada key nos campos React", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      render(<PropertiesInspector document={documentFixture()} selection={[ids.node]} editable onCommand={vi.fn()} />);
      expect(consoleError.mock.calls.flat().join(" ")).not.toMatch(/containing a "key" prop/i);
    } finally {
      consoleError.mockRestore();
    }
  });

  it("descarta erros de campo ao trocar o elemento selecionado", () => {
    const props = { document: documentFixture(), editable: true, onCommand: vi.fn() };
    const { rerender } = render(<PropertiesInspector {...props} selection={[ids.port]} />);
    const capacity = screen.getByLabelText("Capacidade");
    fireEvent.change(capacity, { target: { value: "0" } });
    fireEvent.blur(capacity);
    expect(screen.getAllByText(/inteiro positivo/i).length).toBeGreaterThan(0);

    rerender(<PropertiesInspector {...props} selection={[ids.node]} />);
    expect(screen.queryByText(/inteiro positivo/i)).not.toBeInTheDocument();
  });

  it("limpa o erro local quando o valor é corrigido para o original persistido", () => {
    render(<PropertiesInspector document={documentFixture()} selection={[ids.port]} editable onCommand={vi.fn()} />);
    const capacity = screen.getByLabelText("Capacidade");
    fireEvent.change(capacity, { target: { value: "0" } });
    fireEvent.blur(capacity);
    expect(capacity).toHaveAttribute("aria-invalid", "true");

    fireEvent.change(capacity, { target: { value: "1" } });
    fireEvent.blur(capacity);
    expect(capacity).toHaveAttribute("aria-invalid", "false");
    expect(screen.queryByText(/inteiro positivo/i)).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it.each([
    ["Posição X", ids.node],
    ["Rotação", ids.node],
    ["Capacidade", ids.port],
  ])("rejeita %s vazio sem substituir o valor canônico por zero", (label, selectedId) => {
    const onCommand = vi.fn();
    render(<PropertiesInspector document={documentFixture()} selection={[selectedId]} editable onCommand={onCommand} />);

    const input = screen.getByLabelText(label);
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);

    expect(onCommand).not.toHaveBeenCalled();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getAllByText(/informe um número/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("status")).toHaveTextContent(/informe um número/i);
  });

  it("sincroniza o rascunho e limpa erros quando o mesmo elemento recebe uma versão canônica remota", async () => {
    const initial = documentFixture();
    const { rerender } = render(
      <PropertiesInspector document={initial} selection={[ids.port]} editable onCommand={vi.fn()} />,
    );
    const capacity = screen.getByLabelText("Capacidade");
    fireEvent.change(capacity, { target: { value: "" } });
    fireEvent.blur(capacity);
    expect(capacity).toHaveAttribute("aria-invalid", "true");

    const remote = structuredClone(initial);
    remote.ports[ids.port] = { ...remote.ports[ids.port] };
    rerender(<PropertiesInspector document={remote} selection={[ids.port]} editable onCommand={vi.fn()} />);

    await waitFor(() => expect(screen.getByLabelText("Capacidade")).toHaveValue(1));
    expect(screen.getByLabelText("Capacidade")).toHaveAttribute("aria-invalid", "false");
    expect(screen.queryByText(/informe um número/i)).not.toBeInTheDocument();
  });

  it("preserva rascunho focado quando uma projeção remota altera outro campo", async () => {
    const initial = documentFixture();
    const { rerender } = render(
      <PropertiesInspector document={initial} selection={[ids.node]} editable onCommand={vi.fn()} />,
    );
    const label = screen.getByLabelText("Rótulo");
    label.focus();
    fireEvent.change(label, { target: { value: "Rascunho local" } });
    expect(label).toHaveFocus();

    const remote = structuredClone(initial);
    remote.nodes[ids.node] = { ...remote.nodes[ids.node], x: 99 };
    rerender(<PropertiesInspector document={remote} selection={[ids.node]} editable onCommand={vi.fn()} />);

    await waitFor(() => expect(screen.getByLabelText("Posição X")).toHaveValue(99));
    expect(screen.getByLabelText("Rótulo")).toBe(label);
    expect(label).toHaveValue("Rascunho local");
    expect(label).toHaveFocus();
  });

  it("preserva rascunho focado e sinaliza conflito quando o mesmo campo muda remotamente", async () => {
    const initial = documentFixture();
    const { rerender } = render(
      <PropertiesInspector document={initial} selection={[ids.node]} editable onCommand={vi.fn()} />,
    );
    const label = screen.getByLabelText("Rótulo");
    label.focus();
    fireEvent.change(label, { target: { value: "Rascunho local" } });

    const remote = structuredClone(initial);
    remote.nodes[ids.node] = { ...remote.nodes[ids.node], label: "Valor remoto" };
    rerender(<PropertiesInspector document={remote} selection={[ids.node]} editable onCommand={vi.fn()} />);

    await waitFor(() => expect(label).toHaveAttribute("aria-invalid", "true"));
    expect(label).toHaveValue("Rascunho local");
    expect(label).toHaveFocus();
    expect(screen.getAllByText(/mudou remotamente/i).length).toBeGreaterThan(0);
  });
});

describe("painel de validação", () => {
  it("agrupa erros e avisos e permite focar o elemento afetado", () => {
    const onFocusElement = vi.fn();
    const issues: readonly ValidationIssue[] = [
      { code: "connection.class", severity: "error", elementId: ids.edge, field: "connectionClass", message: "Classe incompatível." },
      { code: "semantic.missing-tag", severity: "warning", elementId: ids.node, field: "tag", message: "Tag ausente." },
    ];
    render(<ValidationPanel issues={issues} onFocusElement={onFocusElement} />);

    expect(screen.getByRole("heading", { name: "Erros (1)" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Avisos (1)" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /focar: tag ausente/i }));
    expect(onFocusElement).toHaveBeenCalledWith(ids.node);
    expect(screen.getByText(/avisos não bloqueiam/i)).toBeInTheDocument();
  });

  it("não cria botão de foco para issue sem elemento", () => {
    render(<ValidationPanel issues={[{ code: "schema.invalid", severity: "error", message: "Documento inválido." }]} onFocusElement={vi.fn()} />);
    expect(screen.getByText("Documento inválido.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("integração do inspetor no studio", () => {
  it("foca uma porta pelo issue, edita pelo comando canônico e salva a mudança", async () => {
    const document = editorDocument();
    const save = vi.fn().mockImplementation(async (_id, _token, _document, revision) => revision + 1);
    const services: PidServices = {
      document: {
        create: vi.fn(),
        open: vi.fn().mockResolvedValue({ scope: "edit", document, revision: 1 }),
        save,
        regenerate: vi.fn(),
        softDelete: vi.fn(),
        restore: vi.fn(),
      },
      catalog: { list: vi.fn() },
      collaboration: { connect: vi.fn() },
      recent: { list: vi.fn().mockReturnValue([]), upsert: vi.fn() },
    };
    const router = createMemoryRouter([{ path: "/pid/:diagramId", element: <PidEditorPage /> }], {
      initialEntries: [`/pid/${ids.document}#access=edit-token`],
    });
    render(<PidServicesProvider services={services}><RouterProvider router={router} /></PidServicesProvider>);

    await screen.findByRole("button", { name: "Bomba P-1" });
    fireEvent.click(await screen.findByRole("button", { name: /focar: a porta obrigatória sw está desconectada/i }));
    expect(screen.getByRole("heading", { name: "Porta" })).toBeInTheDocument();

    const capacity = screen.getByLabelText("Capacidade");
    fireEvent.change(capacity, { target: { value: "2" } });
    fireEvent.blur(capacity);

    await waitFor(() => expect(save).toHaveBeenCalledWith(
      ids.document,
      "edit-token",
      expect.objectContaining({
        ports: expect.objectContaining({
          "30000000-0000-4000-8000-000000000002": expect.objectContaining({ capacity: 2 }),
        }),
      }),
      1,
    ), { timeout: 2_000 });
  });

  it("associa ao campo a rejeição real do comando e não agenda autosave", async () => {
    const save = vi.fn();
    const services: PidServices = {
      document: {
        create: vi.fn(),
        open: vi.fn().mockResolvedValue({ scope: "edit", document: overloadedEditorDocument(), revision: 1 }),
        save,
        regenerate: vi.fn(),
        softDelete: vi.fn(),
        restore: vi.fn(),
      },
      catalog: { list: vi.fn() },
      collaboration: { connect: vi.fn() },
      recent: { list: vi.fn().mockReturnValue([]), upsert: vi.fn() },
    };
    const router = createMemoryRouter([{ path: "/pid/:diagramId", element: <PidEditorPage /> }], {
      initialEntries: [`/pid/${ids.document}#access=edit-token`],
    });
    render(<PidServicesProvider services={services}><RouterProvider router={router} /></PidServicesProvider>);

    fireEvent.click(await screen.findByRole("button", { name: /focar: a capacidade da porta foi excedida/i }));
    const direction = screen.getByLabelText("Direção");
    fireEvent.change(direction, { target: { value: "input" } });
    fireEvent.blur(direction);

    await waitFor(() => expect(direction).toHaveAttribute("aria-invalid", "true"));
    const errorId = direction.getAttribute("aria-describedby");
    expect(errorId).toBeTruthy();
    const inlineError = document.getElementById(errorId!);
    expect(inlineError).toHaveTextContent(/comando|violação|melhora/i);
    expect(within(screen.getByRole("region", { name: "Inspetor" })).getByRole("status")).toHaveTextContent(inlineError!.textContent ?? "");
    expect(save).not.toHaveBeenCalled();
  });
});

function documentFixture(): PidDocument {
  return {
    schemaVersion: 1,
    id: ids.document,
    metadata: {
      title: "Documento de teste",
      standard: "free",
      catalogVersion: "local-v1",
      createdAt: "2026-08-09T00:00:00.000Z",
      updatedAt: "2026-08-09T00:00:00.000Z",
      utilityCategories: [],
    },
    nodes: {
      [ids.node]: { id: ids.node, symbolKey: "test.pump", catalogVersion: "local-v1", x: 10, y: 20, width: 96, height: 64, rotation: 0, tag: "P-1", label: "Bomba", properties: { service: "process" } },
    },
    ports: {
      [ids.port]: { id: ids.port, nodeId: ids.node, templateKey: "out", direction: "output", connectionClass: "process", capacity: 1 },
    },
    edges: {
      [ids.edge]: { id: ids.edge, sourcePortId: ids.port, targetPortId: ids.port, connectionClass: "process", lineStyle: "supply-impulse", route: [], tag: "L-1", label: "Linha", properties: {} },
    },
    annotations: {
      [ids.annotation]: { id: ids.annotation, kind: "note", text: "Nota", x: 30, y: 40, width: 120, height: 80, rotation: 0, properties: {} },
    },
    groups: {
      [ids.group]: { id: ids.group, label: "Unidade 100", memberIds: [ids.node], x: -24, y: -14, width: 164, height: 132, properties: {} },
    },
  };
}

function editorDocument(): PidDocument {
  const document = documentFixture();
  document.nodes[ids.node].symbolKey = "drawio.pid.pumps.cavity-pump";
  document.ports = {
    "30000000-0000-4000-8000-000000000002": {
      id: "30000000-0000-4000-8000-000000000002",
      nodeId: ids.node,
      templateKey: "sw",
      direction: "bidirectional",
      connectionClass: "process",
      capacity: 1,
    },
    [ids.port]: {
      ...document.ports[ids.port],
      templateKey: "se",
      direction: "bidirectional",
    },
  };
  document.edges = {};
  document.annotations = {};
  document.groups = {};
  return document;
}

function overloadedEditorDocument(): PidDocument {
  const document = editorDocument();
  const sourcePort = "30000000-0000-4000-8000-000000000001";
  const firstTank = "20000000-0000-4000-8000-000000000002";
  const secondTank = "20000000-0000-4000-8000-000000000003";
  const firstInlet = "30000000-0000-4000-8000-000000000003";
  const firstOutlet = "30000000-0000-4000-8000-000000000004";
  const secondInlet = "30000000-0000-4000-8000-000000000005";
  const secondOutlet = "30000000-0000-4000-8000-000000000006";
  document.nodes[firstTank] = {
    ...document.nodes[ids.node], id: firstTank, symbolKey: "drawio.pid.vessels.tank", x: 260, tag: "T-1", label: "Tanque 1",
  };
  document.nodes[secondTank] = {
    ...document.nodes[ids.node], id: secondTank, symbolKey: "drawio.pid.vessels.tank", x: 520, tag: "T-2", label: "Tanque 2",
  };
  document.ports[sourcePort] = { ...document.ports[ids.port], id: sourcePort, templateKey: "discharge", capacity: 1 };
  document.ports[firstInlet] = { id: firstInlet, nodeId: firstTank, templateKey: "inlet", direction: "input", connectionClass: "process", capacity: 2 };
  document.ports[firstOutlet] = { id: firstOutlet, nodeId: firstTank, templateKey: "outlet", direction: "output", connectionClass: "process", capacity: 1 };
  document.ports[secondInlet] = { id: secondInlet, nodeId: secondTank, templateKey: "inlet", direction: "input", connectionClass: "process", capacity: 2 };
  document.ports[secondOutlet] = { id: secondOutlet, nodeId: secondTank, templateKey: "outlet", direction: "output", connectionClass: "process", capacity: 1 };
  document.edges = {
    "40000000-0000-4000-8000-000000000002": {
      id: "40000000-0000-4000-8000-000000000002", sourcePortId: sourcePort, targetPortId: firstInlet,
      connectionClass: "process", lineStyle: "supply-impulse", route: [], tag: "L-1", label: "Linha 1", properties: {},
    },
    "40000000-0000-4000-8000-000000000003": {
      id: "40000000-0000-4000-8000-000000000003", sourcePortId: sourcePort, targetPortId: secondInlet,
      connectionClass: "process", lineStyle: "supply-impulse", route: [], tag: "L-2", label: "Linha 2", properties: {},
    },
  };
  return document;
}
