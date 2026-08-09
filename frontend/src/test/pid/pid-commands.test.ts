import { describe, expect, it } from "vitest";

import {
  DomainCommandError,
  alignSelection,
  applyCommand,
  assertDocumentInvariants,
  affectedGroupIdsForCommand,
  connectPorts,
  deleteSelection,
  duplicateSelection,
  groupSelection,
  insertAnnotation,
  insertSymbol,
  moveSelection,
  patchElement,
  renameDocument,
  rotateSelection,
  type CatalogSymbol,
  type CommandContext,
} from "@/features/pid/domain/commands";
import { createIdAllocator, reduceCommand } from "@/features/pid/domain/command-reducers";
import { recalculateGroupBounds } from "@/features/pid/domain/graph-operations";
import type { PidDocument } from "@/features/pid/domain/model";
import { createEmptyDocument } from "@/features/pid/domain/schema";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const symbol: CatalogSymbol = {
  key: "centrifugal-pump",
  standards: ["isa"],
  catalogVersion: "local-v1",
  name: "Bomba centrífuga",
  defaultSize: { width: 96, height: 64 },
  properties: { service: "process" },
  portTemplates: [
    { key: "suction", direction: "input", connectionClass: "process", capacity: 1 },
    { key: "discharge", direction: "output", connectionClass: "process", capacity: 1 },
  ],
};

function emptyDocument(): PidDocument {
  return createEmptyDocument(
    { title: "Novo P&ID", standard: "isa" },
    {
      generateId: () => "10000000-0000-4000-8000-000000000001",
      now: () => new Date("2026-08-09T12:00:00.000Z"),
    },
  );
}

function deterministicContext(start = 1): CommandContext {
  let sequence = start;
  return {
    generateId: () => `${(sequence++).toString(16).padStart(8, "0")}-0000-4000-8000-000000000000`,
    now: () => new Date("2026-08-09T13:00:00.000Z"),
  };
}

function connectedGroup(): PidDocument {
  const context = deterministicContext();
  let document = emptyDocument();
  document = applyCommand(document, insertSymbol(symbol, { x: 0, y: 0 }), context);
  document = applyCommand(document, insertSymbol(symbol, { x: 200, y: 0 }), context);
  const [firstNode, secondNode] = Object.values(document.nodes);
  const firstOutput = Object.values(document.ports).find(
    (port) => port.nodeId === firstNode.id && port.direction === "output",
  );
  const secondInput = Object.values(document.ports).find(
    (port) => port.nodeId === secondNode.id && port.direction === "input",
  );
  if (!firstOutput || !secondInput) throw new Error("Fixture de portas inválida.");
  document = applyCommand(document, connectPorts(firstOutput.id, secondInput.id), context);
  return applyCommand(document, groupSelection([firstNode.id, secondNode.id]), context);
}

function twoGroupsAndUngrouped(): PidDocument {
  const context = deterministicContext(1_000);
  let document = emptyDocument();
  for (let index = 0; index < 6; index += 1) {
    document = applyCommand(document, insertSymbol(symbol, { x: index * 160, y: 0 }), context);
  }
  const nodeIds = Object.keys(document.nodes);
  document = applyCommand(document, groupSelection(nodeIds.slice(0, 2)), context);
  return applyCommand(document, groupSelection(nodeIds.slice(2, 4)), context);
}

function reduceForTest(document: PidDocument, command: Parameters<typeof reduceCommand>[1], start: number): PidDocument {
  const context = deterministicContext(start);
  return reduceCommand(document, command, createIdAllocator(document, context.generateId!));
}

describe("comandos canônicos P&ID", () => {
  it("insere nó e materializa portas com UUIDs distintos", () => {
    const empty = emptyDocument();
    const next = applyCommand(empty, insertSymbol(symbol, { x: 120, y: 80 }));
    const node = Object.values(next.nodes)[0];
    const ports = Object.values(next.ports);

    expect(node.id).toMatch(UUID_PATTERN);
    expect(new Set([node.id, ...ports.map((port) => port.id)])).toHaveLength(3);
    expect(ports.every((port) => port.nodeId === node.id)).toBe(true);
    expect(node).toMatchObject({
      symbolKey: symbol.key,
      catalogVersion: symbol.catalogVersion,
      label: symbol.name,
      x: 120,
      y: 80,
      width: 96,
      height: 64,
    });
  });

  it("não muta a entrada e compartilha mapas que não foram alterados", () => {
    const empty = emptyDocument();
    const before = structuredClone(empty);
    const canonical = applyCommand(empty, renameDocument("Canônico"), deterministicContext());
    const next = applyCommand(canonical, insertSymbol(symbol, { x: 120, y: 80 }), deterministicContext(10));

    expect(empty).toEqual(before);
    expect(canonical.nodes).not.toBe(empty.nodes);
    expect(next).not.toBe(canonical);
    expect(next.nodes).not.toBe(canonical.nodes);
    expect(next.ports).not.toBe(canonical.ports);
    expect(next.edges).toBe(canonical.edges);
    expect(next.annotations).toBe(canonical.annotations);
    expect(next.groups).toBe(canonical.groups);
  });

  it("rejeita símbolo incompatível com o standard sem tocar no documento", () => {
    const empty = emptyDocument();
    const before = structuredClone(empty);

    expect(() => applyCommand(
      empty,
      insertSymbol({ ...symbol, standards: ["iso"] }, { x: 0, y: 0 }),
      deterministicContext(),
    )).toThrow(DomainCommandError);
    expect(empty).toEqual(before);
  });

  it("conecta portas compatíveis e bloqueia direção, classe, capacidade e autorreferência", () => {
    const context = deterministicContext();
    let document = emptyDocument();
    document = applyCommand(document, insertSymbol(symbol, { x: 0, y: 0 }), context);
    document = applyCommand(document, insertSymbol(symbol, { x: 200, y: 0 }), context);
    const [first, second] = Object.values(document.nodes);
    const port = (nodeId: string, direction: "input" | "output") => Object.values(document.ports)
      .find((candidate) => candidate.nodeId === nodeId && candidate.direction === direction)!;

    const connected = applyCommand(
      document,
      connectPorts(port(first.id, "output").id, port(second.id, "input").id),
      context,
    );
    expect(Object.values(connected.edges)).toHaveLength(1);
    expect(assertDocumentInvariants(connected).filter((issue) => issue.severity === "error")).toEqual([]);
    expect(() => applyCommand(
      connected,
      connectPorts(port(first.id, "output").id, port(second.id, "input").id),
      context,
    )).toThrow(/capacidade/i);
    expect(() => applyCommand(
      document,
      connectPorts(port(first.id, "input").id, port(second.id, "output").id),
      context,
    )).toThrow(/direção/i);
    expect(() => applyCommand(
      document,
      connectPorts(port(first.id, "output").id, port(first.id, "input").id),
      context,
    )).toThrow(/mesmo nó/i);

    const mismatched = {
      ...document,
      ports: {
        ...document.ports,
        [port(second.id, "input").id]: {
          ...port(second.id, "input"),
          connectionClass: "utility" as const,
        },
      },
    };
    expect(() => applyCommand(
      mismatched,
      connectPorts(port(first.id, "output").id, port(second.id, "input").id),
      context,
    )).toThrow(/classe/i);
  });

  it("duplica o grupo preservando relações internas e trocando todos os IDs", () => {
    const withConnectedGroup = connectedGroup();
    const groupIds = Object.keys(withConnectedGroup.groups);
    const oldIds = new Set([
      ...Object.keys(withConnectedGroup.nodes),
      ...Object.keys(withConnectedGroup.ports),
      ...Object.keys(withConnectedGroup.edges),
      ...Object.keys(withConnectedGroup.groups),
    ]);
    const duplicated = applyCommand(
      withConnectedGroup,
      duplicateSelection(groupIds, { x: 24, y: 24 }),
      deterministicContext(100),
    );

    expect(Object.keys(duplicated.nodes)).toHaveLength(4);
    expect(Object.keys(duplicated.edges)).toHaveLength(2);
    expect(Object.keys(duplicated.groups)).toHaveLength(2);
    const newNodes = Object.values(duplicated.nodes).filter((node) => !oldIds.has(node.id));
    const newPorts = Object.values(duplicated.ports).filter((port) => !oldIds.has(port.id));
    const newEdges = Object.values(duplicated.edges).filter((edge) => !oldIds.has(edge.id));
    const newGroups = Object.values(duplicated.groups).filter((group) => !oldIds.has(group.id));
    expect(newNodes).toHaveLength(2);
    expect(newPorts).toHaveLength(4);
    expect(newEdges).toHaveLength(1);
    expect(newGroups).toHaveLength(1);
    expect(newNodes.map(({ x, y }) => ({ x, y }))).toEqual([
      { x: 24, y: 24 },
      { x: 224, y: 24 },
    ]);
    expect(newPorts.every((port) => newNodes.some((node) => node.id === port.nodeId))).toBe(true);
    expect(newGroups[0].memberIds.every((id) => newNodes.some((node) => node.id === id))).toBe(true);
    expect(newPorts.some((port) => port.id === newEdges[0].sourcePortId)).toBe(true);
    expect(newPorts.some((port) => port.id === newEdges[0].targetPortId)).toBe(true);
    expect(assertDocumentInvariants(duplicated).filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("não duplica arestas externas à seleção", () => {
    const context = deterministicContext(200);
    let document = connectedGroup();
    document = applyCommand(document, insertSymbol(symbol, { x: 400, y: 0 }), context);
    const nodes = Object.values(document.nodes);
    const output = Object.values(document.ports).find(
      (port) => port.nodeId === nodes[1].id && port.direction === "output",
    )!;
    const input = Object.values(document.ports).find(
      (port) => port.nodeId === nodes[2].id && port.direction === "input",
    )!;
    document = applyCommand(document, connectPorts(output.id, input.id), context);

    const duplicated = applyCommand(
      document,
      duplicateSelection(Object.keys(document.groups), { x: 20, y: 20 }),
      context,
    );
    expect(Object.keys(duplicated.edges)).toHaveLength(3);
  });

  it("move, alinha e rotaciona nós e anotações selecionados", () => {
    const context = deterministicContext();
    let document = emptyDocument();
    document = applyCommand(document, insertSymbol(symbol, { x: 20, y: 30 }), context);
    document = applyCommand(document, insertAnnotation(" Nota ", { x: 100, y: 80 }), context);
    const nodeId = Object.keys(document.nodes)[0];
    const annotationId = Object.keys(document.annotations)[0];

    document = applyCommand(document, moveSelection([nodeId, annotationId], { x: 5, y: -10 }), context);
    expect(document.nodes[nodeId]).toMatchObject({ x: 25, y: 20 });
    expect(document.annotations[annotationId]).toMatchObject({ text: "Nota", x: 105, y: 70 });
    document = applyCommand(document, alignSelection([nodeId, annotationId], "left"), context);
    expect(document.nodes[nodeId].x).toBe(25);
    expect(document.annotations[annotationId].x).toBe(25);
    document = applyCommand(document, rotateSelection([nodeId, annotationId], -90), context);
    expect(document.nodes[nodeId].rotation).toBe(270);
    expect(document.annotations[annotationId].rotation).toBe(270);
  });

  it("agrupa somente nós e exclui em cascata", () => {
    const context = deterministicContext();
    let document = connectedGroup();
    const [deletedNode] = Object.values(document.nodes);
    const deletedPorts = Object.values(document.ports)
      .filter((port) => port.nodeId === deletedNode.id)
      .map((port) => port.id);
    document = applyCommand(document, deleteSelection([deletedNode.id]), context);

    expect(document.nodes[deletedNode.id]).toBeUndefined();
    expect(deletedPorts.every((id) => !document.ports[id])).toBe(true);
    expect(Object.keys(document.edges)).toHaveLength(0);
    expect(Object.values(document.groups)[0].memberIds).not.toContain(deletedNode.id);
    expect(() => applyCommand(
      document,
      groupSelection(Object.keys(document.annotations)),
      context,
    )).toThrow(/nó/i);
  });

  it("limita patches a campos seguros e renomeia com texto normalizado", () => {
    const context = deterministicContext();
    let document = applyCommand(emptyDocument(), insertSymbol(symbol, { x: 0, y: 0 }), context);
    const nodeId = Object.keys(document.nodes)[0];
    document = applyCommand(document, patchElement(nodeId, { label: "P-101", x: 12 }), context);
    expect(document.nodes[nodeId]).toMatchObject({ label: "P-101", x: 12 });
    expect(() => applyCommand(document, patchElement(nodeId, { id: "outro" }), context)).toThrow(/campo/i);
    expect(() => applyCommand(
      document,
      patchElement(Object.keys(document.ports)[0], { nodeId }),
      context,
    )).toThrow(/campo/i);
    expect(applyCommand(document, renameDocument("  Área 200  "), context).metadata.title).toBe("Área 200");
    expect(() => applyCommand(document, renameDocument(" \n "), context)).toThrow(/título/i);
  });

  it("reporta violações canônicas, conexões inválidas e tags duplicadas", () => {
    const document = connectedGroup();
    const [firstId, secondId] = Object.keys(document.nodes);
    const invalid: PidDocument = {
      ...document,
      nodes: {
        ...document.nodes,
        [firstId]: { ...document.nodes[firstId], tag: "P-101" },
        [secondId]: { ...document.nodes[secondId], tag: " p-101 " },
      },
    };

    expect(assertDocumentInvariants(invalid)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "semantic.duplicate-tag", severity: "warning" }),
    ]));
  });

  it("permite corrigir uma tag duplicada porque diagnósticos de tag não bloqueiam comandos", () => {
    const context = deterministicContext(300);
    const base = connectedGroup();
    const [firstId, secondId] = Object.keys(base.nodes);
    const withDuplicateTag: PidDocument = {
      ...base,
      nodes: {
        ...base.nodes,
        [firstId]: { ...base.nodes[firstId], tag: "P-101" },
        [secondId]: { ...base.nodes[secondId], tag: "p-101" },
      },
    };

    const repaired = applyCommand(withDuplicateTag, patchElement(secondId, { tag: "P-102" }), context);

    expect(repaired.nodes[secondId].tag).toBe("P-102");
    expect(assertDocumentInvariants(repaired).filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("classifica tags ausentes e inválidas somente como warnings", () => {
    const base = connectedGroup();
    const [firstId, secondId] = Object.keys(base.nodes);
    const diagnosed: PidDocument = {
      ...base,
      nodes: {
        ...base.nodes,
        [firstId]: { ...base.nodes[firstId], tag: "" },
        [secondId]: { ...base.nodes[secondId], tag: "tag inválida" },
      },
    };

    expect(assertDocumentInvariants(diagnosed)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "semantic.missing-tag", severity: "warning" }),
      expect.objectContaining({ code: "semantic.invalid-tag", severity: "warning" }),
    ]));
    expect(assertDocumentInvariants(diagnosed).filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("permite remover uma conexão inválida importada e exige melhora monotônica", () => {
    const base = connectedGroup();
    const edge = Object.values(base.edges)[0];
    const source = base.ports[edge.sourcePortId];
    const invalidRemote: PidDocument = {
      ...base,
      ports: { ...base.ports, [source.id]: { ...source, direction: "input" } },
    };
    expect(assertDocumentInvariants(invalidRemote)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "connection.direction", severity: "error" }),
    ]));

    expect(() => applyCommand(invalidRemote, renameDocument("Ainda inválido"))).toThrowError(
      expect.objectContaining({
        issues: expect.arrayContaining([expect.objectContaining({ code: "command.repair-required" })]),
      }),
    );
    const repaired = applyCommand(invalidRemote, deleteSelection([edge.id]), deterministicContext(320));
    expect(Object.keys(repaired.edges)).toHaveLength(0);
    expect(assertDocumentInvariants(repaired).filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("recalcula grupos inválidos somente para comandos que alteram membros ou geometria", () => {
    const base = connectedGroup();
    const group = Object.values(base.groups)[0];
    const invalidGroup: PidDocument = {
      ...base,
      groups: { ...base.groups, [group.id]: { ...group, x: group.x + 7 } },
    };
    const [firstNode, secondNode] = Object.values(base.nodes);
    const edge = Object.values(base.edges)[0];
    const firstInput = Object.values(base.ports).find((port) => port.nodeId === firstNode.id && port.direction === "input")!;
    const secondOutput = Object.values(base.ports).find((port) => port.nodeId === secondNode.id && port.direction === "output")!;
    expect(assertDocumentInvariants(invalidGroup)).toContainEqual(expect.objectContaining({ code: "group.bounds" }));

    for (const command of [
      renameDocument("Sem reparo"),
      insertAnnotation("Nota", { x: 20, y: 20 }),
      connectPorts(secondOutput.id, firstInput.id),
      patchElement(firstNode.id, { tag: "P-999" }),
      patchElement(firstNode.id, { properties: { service: "updated" } }),
      deleteSelection([edge.id]),
    ]) {
      expect(() => applyCommand(invalidGroup, command, deterministicContext(600))).toThrowError(
        expect.objectContaining({
          issues: expect.arrayContaining([expect.objectContaining({ code: "command.repair-required" })]),
        }),
      );
    }

    const withAnnotation = applyCommand(base, insertAnnotation("Nota móvel", { x: 20, y: 20 }), deterministicContext(650));
    const annotationId = Object.keys(withAnnotation.annotations)[0];
    const invalidWithAnnotation: PidDocument = {
      ...withAnnotation,
      groups: { ...withAnnotation.groups, [group.id]: { ...group, x: group.x + 7 } },
    };
    expect(() => applyCommand(
      invalidWithAnnotation,
      moveSelection([annotationId], { x: 16, y: 0 }),
      deterministicContext(651),
    )).toThrowError(expect.objectContaining({
      issues: expect.arrayContaining([expect.objectContaining({ code: "command.repair-required" })]),
    }));

    const repairedByMove = applyCommand(
      invalidGroup,
      moveSelection([firstNode.id], { x: 16, y: 0 }),
      deterministicContext(700),
    );
    expect(assertDocumentInvariants(repairedByMove).filter(({ severity }) => severity === "error")).toEqual([]);

    const repairedByPatch = applyCommand(
      invalidGroup,
      patchElement(firstNode.id, { width: firstNode.width + 16 }),
      deterministicContext(701),
    );
    expect(assertDocumentInvariants(repairedByPatch).filter(({ severity }) => severity === "error")).toEqual([]);
  });

  it("isola o recálculo aos IDs de grupo realmente afetados", () => {
    const base = twoGroupsAndUngrouped();
    const [groupA, groupB] = Object.values(base.groups);
    const invalid: PidDocument = {
      ...base,
      groups: { ...base.groups, [groupA.id]: { ...groupA, x: groupA.x + 9 } },
    };
    const groupedBNode = groupB.memberIds[0];
    const ungrouped = Object.keys(base.nodes).filter((id) => (
      !groupA.memberIds.includes(id) && !groupB.memberIds.includes(id)
    ));

    const cases = [
      moveSelection([ungrouped[0]], { x: 16, y: 0 }),
      moveSelection([groupedBNode], { x: 16, y: 0 }),
      alignSelection(groupB.memberIds, "left"),
      rotateSelection([groupedBNode], 90),
      deleteSelection([groupedBNode]),
    ];
    for (const [index, command] of cases.entries()) {
      const next = reduceForTest(invalid, command, 800 + index * 20);
      const affected = affectedGroupIdsForCommand(invalid, next, command);
      expect(affected.has(groupA.id)).toBe(false);
      expect([...affected]).toEqual(index === 0 ? [] : [groupB.id]);
      const normalized = recalculateGroupBounds(next, affected);
      expect(normalized.groups[groupA.id]).toEqual(invalid.groups[groupA.id]);
      if (index > 0 && normalized.groups[groupB.id]) {
        expect(normalized.groups[groupB.id]).not.toBe(next.groups[groupB.id]);
      }
    }

    const duplicate = duplicateSelection([groupB.id], { x: 32, y: 32 });
    const duplicated = reduceForTest(invalid, duplicate, 950);
    const duplicatedAffected = affectedGroupIdsForCommand(invalid, duplicated, duplicate);
    const createdGroupId = Object.keys(duplicated.groups).find((id) => !invalid.groups[id])!;
    expect(duplicatedAffected).toEqual(new Set([groupB.id, createdGroupId]));
    expect(duplicatedAffected.has(groupA.id)).toBe(false);

    const createGroup = groupSelection(ungrouped);
    const grouped = reduceForTest(invalid, createGroup, 980);
    const groupedAffected = affectedGroupIdsForCommand(invalid, grouped, createGroup);
    const newGroupId = Object.keys(grouped.groups).find((id) => !invalid.groups[id])!;
    expect(groupedAffected).toEqual(new Set([newGroupId]));
  });

  it("rejeita uma nova violação mesmo quando o documento importado já está inválido", () => {
    const base = connectedGroup();
    const edge = Object.values(base.edges)[0];
    const source = base.ports[edge.sourcePortId];
    const target = base.ports[edge.targetPortId];
    const invalidRemote: PidDocument = {
      ...base,
      ports: { ...base.ports, [source.id]: { ...source, direction: "input" } },
    };

    expect(() => applyCommand(
      invalidRemote,
      patchElement(target.id, { connectionClass: "utility" }),
      deterministicContext(330),
    )).toThrowError(expect.objectContaining({
      issues: expect.arrayContaining([expect.objectContaining({ code: "command.repair-required" })]),
    }));
  });

  it("aceita portas e aresta internas explicitamente selecionadas sem duplicá-las duas vezes", () => {
    const base = connectedGroup();
    const nodeIds = Object.keys(base.nodes);
    const portIds = Object.keys(base.ports);
    const edgeIds = Object.keys(base.edges);
    const duplicated = applyCommand(
      base,
      duplicateSelection([...nodeIds, ...portIds, ...edgeIds], { x: 10, y: 10 }),
      deterministicContext(340),
    );

    expect(Object.keys(duplicated.nodes)).toHaveLength(4);
    expect(Object.keys(duplicated.ports)).toHaveLength(8);
    expect(Object.keys(duplicated.edges)).toHaveLength(2);
    expect(assertDocumentInvariants(duplicated).filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("rejeita aresta externa explicitamente selecionada para duplicação", () => {
    const context = deterministicContext(360);
    let base = connectedGroup();
    base = applyCommand(base, insertSymbol(symbol, { x: 400, y: 0 }), context);
    const nodes = Object.values(base.nodes);
    const source = Object.values(base.ports).find(
      (port) => port.nodeId === nodes[1].id && port.direction === "output",
    )!;
    const target = Object.values(base.ports).find(
      (port) => port.nodeId === nodes[2].id && port.direction === "input",
    )!;
    base = applyCommand(base, connectPorts(source.id, target.id), context);
    const externalEdge = Object.values(base.edges).find((edge) => edge.sourcePortId === source.id)!;

    expect(() => applyCommand(
      base,
      duplicateSelection([nodes[0].id, nodes[1].id, externalEdge.id], { x: 10, y: 10 }),
      context,
    )).toThrowError(expect.objectContaining({
      issues: expect.arrayContaining([expect.objectContaining({ code: "command.duplicate.external-reference" })]),
    }));
  });

  it("move um grupo sem mover duas vezes membros também selecionados e recalcula bounds", () => {
    const base = connectedGroup();
    const group = Object.values(base.groups)[0];
    const firstMember = base.nodes[group.memberIds[0]];
    const moved = applyCommand(
      base,
      moveSelection([group.id, firstMember.id], { x: 15, y: 20 }),
      deterministicContext(380),
    );

    expect(moved.nodes[firstMember.id]).toMatchObject({ x: firstMember.x + 15, y: firstMember.y + 20 });
    expect(moved.groups[group.id]).toMatchObject({
      x: group.x + 15,
      y: group.y + 20,
      width: group.width,
      height: group.height,
    });
  });

  it("recalcula bounds ao alinhar membros e remove o grupo ao excluir o membro final", () => {
    let document = connectedGroup();
    const groupId = Object.keys(document.groups)[0];
    const memberIds = [...document.groups[groupId].memberIds];
    document = applyCommand(document, alignSelection(memberIds, "left"), deterministicContext(400));
    expect(document.groups[groupId].width).toBe(96);

    document = applyCommand(document, deleteSelection([memberIds[0]]), deterministicContext(410));
    expect(document.groups[groupId]).toMatchObject({
      x: document.nodes[memberIds[1]].x,
      y: document.nodes[memberIds[1]].y,
      width: document.nodes[memberIds[1]].width,
      height: document.nodes[memberIds[1]].height,
    });
    document = applyCommand(document, deleteSelection([memberIds[1]]), deterministicContext(420));
    expect(document.groups[groupId]).toBeUndefined();
  });

  it("rotaciona os membros de um grupo e recalcula seus bounds visuais", () => {
    const base = connectedGroup();
    const group = Object.values(base.groups)[0];
    const rotated = applyCommand(base, rotateSelection([group.id], 90), deterministicContext(430));

    expect(group.memberIds.every((id) => rotated.nodes[id].rotation === 90)).toBe(true);
    expect(rotated.groups[group.id]).toMatchObject({
      x: 16,
      y: -16,
      width: 264,
      height: 96,
    });
  });

  it("inclui o id do documento na unicidade global com caminho exato", () => {
    const base = emptyDocument();
    const collision: PidDocument = {
      ...base,
      nodes: {
        [base.id]: {
          id: base.id,
          symbolKey: "project.test",
          catalogVersion: base.metadata.catalogVersion,
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          rotation: 0,
          tag: "",
          label: "Teste",
          properties: {},
        },
      },
    };

    expect(assertDocumentInvariants(collision)).toContainEqual(expect.objectContaining({
      code: "semantic.duplicate-id",
      severity: "error",
      path: ["nodes", base.id, "id"],
    }));
  });

  it("expõe erros estruturados imutáveis para patches proibidos", () => {
    const context = deterministicContext(440);
    const document = applyCommand(emptyDocument(), insertSymbol(symbol, { x: 0, y: 0 }), context);
    const nodeId = Object.keys(document.nodes)[0];

    try {
      applyCommand(document, patchElement(nodeId, { id: document.id }), context);
      expect.unreachable("O patch deveria falhar.");
    } catch (error) {
      expect(error).toBeInstanceOf(DomainCommandError);
      const commandError = error as DomainCommandError;
      expect(commandError.issues).toContainEqual(expect.objectContaining({
        code: "command.patch.forbidden-field",
        path: ["nodes", nodeId, "id"],
      }));
      expect(Object.isFrozen(commandError.issues)).toBe(true);
      expect(Object.isFrozen(commandError.issues[0])).toBe(true);
      expect(Object.isFrozen(commandError.issues[0].path)).toBe(true);
    }
  });

  it("revalida um documento externo mutável sem reutilizar diagnóstico obsoleto", () => {
    const external = structuredClone(connectedGroup());
    const edge = Object.values(external.edges)[0];
    const source = external.ports[edge.sourcePortId];
    expect(assertDocumentInvariants(external).filter((issue) => issue.code === "connection.direction")).toEqual([]);
    expect(Object.isFrozen(external)).toBe(false);
    expect(Object.isFrozen(source)).toBe(false);

    source.direction = "input";

    expect(assertDocumentInvariants(external)).toContainEqual(expect.objectContaining({
      code: "connection.direction",
      severity: "error",
    }));
  });

  it("destaca a entrada externa antes de confiar e percebe mutações entre comandos", () => {
    const external = structuredClone(connectedGroup());
    const first = applyCommand(external, renameDocument("Primeiro"), deterministicContext(450));
    const edge = Object.values(external.edges)[0];
    external.ports[edge.sourcePortId].direction = "input";

    expect(Object.isFrozen(external)).toBe(false);
    expect(Object.isFrozen(external.nodes)).toBe(false);
    expect(first).not.toBe(external);
    expect(first.nodes).not.toBe(external.nodes);
    expect(() => applyCommand(external, renameDocument("Segundo"), deterministicContext(451))).toThrowError(
      expect.objectContaining({
        issues: expect.arrayContaining([expect.objectContaining({ code: "command.repair-required" })]),
      }),
    );
  });

  it("retorna documento confiável profundamente imutável e compartilha subtrees congelados", () => {
    const external = structuredClone(connectedGroup());
    const nodeId = Object.keys(external.nodes)[0];
    const edgeId = Object.keys(external.edges)[0];
    external.nodes[nodeId].properties = { nested: { value: 1 } };
    external.edges[edgeId].route = [{ x: 0, y: 0 }];
    const first = applyCommand(external, renameDocument("Confiável"), deterministicContext(460));
    const edge = first.edges[edgeId];

    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.nodes)).toBe(true);
    expect(Object.isFrozen(first.nodes[nodeId])).toBe(true);
    expect(Object.isFrozen(first.nodes[nodeId].properties)).toBe(true);
    expect(Object.isFrozen(first.nodes[nodeId].properties.nested)).toBe(true);
    expect(Object.isFrozen(edge.route)).toBe(true);
    expect(Object.isFrozen(edge.route[0])).toBe(true);
    expect(() => {
      (first.nodes[nodeId].properties.nested as { value: number }).value = 2;
    }).toThrow();
    expect(() => { edge.route[0].x = 1; }).toThrow();
    expect(() => edge.route.push({ x: 1, y: 1 })).toThrow();

    const second = applyCommand(first, renameDocument("Ainda confiável"), deterministicContext(461));
    expect(second.nodes).toBe(first.nodes);
    expect(second.ports).toBe(first.ports);
    expect(second.edges).toBe(first.edges);
    expect(assertDocumentInvariants(second).filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it.each(["x", "y", "width", "height"])("bloqueia patch direto do bound derivado %s do grupo", (field) => {
    const document = connectedGroup();
    const groupId = Object.keys(document.groups)[0];

    expect(() => applyCommand(
      document,
      patchElement(groupId, { [field]: 999 }),
      deterministicContext(470),
    )).toThrowError(expect.objectContaining({
      issues: expect.arrayContaining([expect.objectContaining({
        code: "command.patch.forbidden-field",
        path: ["groups", groupId, field],
      })]),
    }));
  });

  it("reconstrói issues rasas congeladas sem preservar alias mutável do path", () => {
    const hostilePath: (string | number)[] = ["nodes", "hostile"];
    const hostileIssue = Object.freeze({
      code: "hostile.issue",
      severity: "error" as const,
      path: hostilePath,
      message: "Issue hostil",
    });

    const error = new DomainCommandError("Falha", [hostileIssue]);
    hostilePath.push("mutated");

    expect(error.issues[0].path).toEqual(["nodes", "hostile"]);
    expect(Object.isFrozen(error.issues[0])).toBe(true);
    expect(Object.isFrozen(error.issues[0].path)).toBe(true);
  });

  it("mantém 100 renomes e movimentos responsivos em 500 nós e 1.000 arestas", () => {
    let document = createReferenceDocument();
    const firstNodeId = Object.keys(document.nodes)[0];
    let tick = 0;
    const context: CommandContext = {
      generateId: () => { throw new Error("Não deveria gerar IDs."); },
      now: () => new Date(1_800_000_000_000 + tick++),
    };
    const startedAt = performance.now();
    for (let index = 0; index < 50; index += 1) {
      document = applyCommand(document, renameDocument(`Referência ${index}`), context);
      document = applyCommand(document, moveSelection([firstNodeId], { x: 1, y: 0 }), context);
    }
    const elapsed = performance.now() - startedAt;

    expect(document.nodes[firstNodeId].x).toBe(50);
    // The focused run is normally below 300 ms. The 2.5 s wall-clock guardrail
    // leaves room for full-suite worker contention while still catching the
    // original 24 s double-traversal regression by a wide margin.
    expect(elapsed).toBeLessThan(2_500);
  });
});

function createReferenceDocument(): PidDocument {
  const base = emptyDocument();
  const nodes: PidDocument["nodes"] = {};
  const ports: PidDocument["ports"] = {};
  const edges: PidDocument["edges"] = {};
  const id = (value: number) => `${value.toString(16).padStart(8, "0")}-1000-4000-8000-000000000000`;
  for (let index = 0; index < 500; index += 1) {
    const nodeId = id(index + 10);
    nodes[nodeId] = {
      id: nodeId,
      symbolKey: "project.reference",
      catalogVersion: base.metadata.catalogVersion,
      x: index * 20,
      y: 0,
      width: 10,
      height: 10,
      rotation: 0,
      tag: "",
      label: "Referência",
      properties: {},
    };
    for (let lane = 0; lane < 2; lane += 1) {
      const outputId = id(1_000 + index * 4 + lane * 2);
      const inputId = id(1_000 + index * 4 + lane * 2 + 1);
      ports[outputId] = {
        id: outputId,
        nodeId,
        templateKey: `out-${lane}`,
        direction: "output",
        connectionClass: "process",
        capacity: 1,
      };
      ports[inputId] = {
        id: inputId,
        nodeId,
        templateKey: `in-${lane}`,
        direction: "input",
        connectionClass: "process",
        capacity: 1,
      };
    }
  }
  for (let index = 0; index < 500; index += 1) {
    const targetIndex = (index + 1) % 500;
    for (let lane = 0; lane < 2; lane += 1) {
      const edgeId = id(4_000 + index * 2 + lane);
      edges[edgeId] = {
        id: edgeId,
        sourcePortId: id(1_000 + index * 4 + lane * 2),
        targetPortId: id(1_000 + targetIndex * 4 + lane * 2 + 1),
        connectionClass: "process",
        route: [],
        tag: "",
        label: "",
        properties: {},
      };
    }
  }
  return { ...base, nodes, ports, edges };
}
