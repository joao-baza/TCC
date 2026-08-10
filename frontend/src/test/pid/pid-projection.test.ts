import { expect, it } from "vitest";

import type { PidDocument, PidJsonValue } from "@/features/pid/domain/model";
import { projectPidDocument } from "@/features/pid/domain/projection";
import { parsePidDocument } from "@/features/pid/domain/schema";

const ids = {
  document: "10000000-0000-4000-8000-000000000001",
  node: "20000000-0000-4000-8000-000000000002",
  sourcePort: "30000000-0000-4000-8000-000000000003",
  targetPort: "40000000-0000-4000-8000-000000000004",
  edge: "50000000-0000-4000-8000-000000000005",
  annotation: "60000000-0000-4000-8000-000000000006",
  group: "70000000-0000-4000-8000-000000000007",
} as const;

function createPopulatedDocument(): PidDocument {
  return {
    schemaVersion: 1,
    id: ids.document,
    metadata: { title: "Área 100", standard: "free", catalogVersion: "local-v1", createdAt: "2026-08-09T12:00:00.000Z", updatedAt: "2026-08-09T12:00:00.000Z" },
    nodes: {
      [ids.node]: { id: ids.node, symbolKey: "tank", catalogVersion: "local-v1", x: 10, y: 20, width: 100, height: 80, rotation: 90, tag: "T-100", label: "Tanque", properties: { nested: { value: "node" } } },
    },
    ports: {
      [ids.sourcePort]: { id: ids.sourcePort, nodeId: ids.node, templateKey: "outlet", direction: "output", connectionClass: "process", capacity: 2 },
      [ids.targetPort]: { id: ids.targetPort, nodeId: ids.node, templateKey: "inlet", direction: "input", connectionClass: "process", capacity: 1 },
    },
    edges: {
      [ids.edge]: { id: ids.edge, sourcePortId: ids.sourcePort, targetPortId: ids.targetPort, connectionClass: "process", lineStyle: "solid-thick", route: [{ x: 110, y: 20 }], tag: "L-100", label: "Linha", properties: { nested: { value: "edge" } } },
    },
    annotations: {
      [ids.annotation]: { id: ids.annotation, kind: "callout", text: "Nota", x: 120, y: 30, width: 160, height: 50, rotation: 0, nodeId: ids.node, edgeId: ids.edge, properties: { nested: { value: "annotation" } } },
    },
    groups: {
      [ids.group]: { id: ids.group, label: "Área", memberIds: [ids.node], x: 0, y: 0, width: 400, height: 300, properties: { nested: { value: "group" } } },
    },
  };
}

function nestedObject(value: PidJsonValue): Record<string, PidJsonValue> {
  if (!value || Array.isArray(value) || typeof value !== "object") throw new Error("Propriedade aninhada ausente.");
  return value;
}

it("projeta um grafo válido como arrays ordenados por código e sem estado de interface", () => {
  const document = parsePidDocument(createPopulatedDocument());
  const projection = projectPidDocument(document);

  expect(projection).toMatchObject({ id: document.id, metadata: document.metadata });
  expect(projection.nodes.map(({ id }) => id)).toEqual([ids.node]);
  expect(projection.ports.map(({ id }) => id)).toEqual([ids.sourcePort, ids.targetPort]);
  expect(projection.edges.map(({ id }) => id)).toEqual([ids.edge]);
  expect(projection.annotations.map(({ id }) => id)).toEqual([ids.annotation]);
  expect(projection.groups.map(({ id }) => id)).toEqual([ids.group]);
  expect("viewport" in projection).toBe(false);
  expect("selection" in projection).toBe(false);
});

it("ordena IDs por unidades de código, independentemente do locale do host", () => {
  const document = createPopulatedDocument();
  const uppercaseId = "A0000000-0000-4000-8000-000000000008";
  const lowercaseId = "a0000000-0000-4000-8000-000000000009";
  document.nodes = {
    [lowercaseId]: { ...document.nodes[ids.node], id: lowercaseId },
    [uppercaseId]: { ...document.nodes[ids.node], id: uppercaseId },
  };

  expect(projectPidDocument(document).nodes.map(({ id }) => id)).toEqual([uppercaseId, lowercaseId]);
});

it("retorna uma projeção totalmente destacada do documento canônico", () => {
  const document = createPopulatedDocument();
  const sourceSnapshot = JSON.parse(JSON.stringify(document));
  const projection = projectPidDocument(document);

  projection.metadata.title = "Alterado";
  projection.nodes[0].label = "Outro tanque";
  nestedObject(projection.nodes[0].properties.nested).value = "outro nó";
  projection.ports[0].templateKey = "alterado";
  projection.edges[0].label = "Outra linha";
  projection.edges[0].route[0].x = 999;
  nestedObject(projection.edges[0].properties.nested).value = "outra borda";
  projection.annotations[0].text = "Outra nota";
  nestedObject(projection.annotations[0].properties.nested).value = "outra anotação";
  projection.groups[0].memberIds[0] = ids.document;
  nestedObject(projection.groups[0].properties.nested).value = "outro grupo";

  expect(document).toEqual(sourceSnapshot);
});
