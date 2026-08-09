import { expect, it } from "vitest";

import type { PidDocument } from "@/features/pid/domain/model";
import { projectPidDocument } from "@/features/pid/domain/projection";

it("projeta todos os mapas canônicos como arrays ordenados por ID", () => {
  const document: PidDocument = {
    schemaVersion: 1,
    id: "f73f539d-5eb8-4d47-a2f0-27ab1c6b0f0b",
    metadata: {
      title: "Área 100",
      standard: "free",
      catalogVersion: "local-v1",
      createdAt: "2026-08-09T12:00:00.000Z",
      updatedAt: "2026-08-09T12:00:00.000Z",
    },
    nodes: {
      b: { id: "b", symbolKey: "pump", catalogVersion: "local-v1", x: 0, y: 0, width: 80, height: 80, rotation: 0, tag: "P-2", label: "Bomba 2", properties: {} },
      a: { id: "a", symbolKey: "pump", catalogVersion: "local-v1", x: 0, y: 0, width: 80, height: 80, rotation: 0, tag: "P-1", label: "Bomba 1", properties: {} },
    },
    ports: {
      b: { id: "b", nodeId: "a", templateKey: "outlet", direction: "output", connectionClass: "process", capacity: 1 },
      a: { id: "a", nodeId: "a", templateKey: "inlet", direction: "input", connectionClass: "process", capacity: 1 },
    },
    edges: {
      b: { id: "b", sourcePortId: "a", targetPortId: "b", connectionClass: "process", route: [], tag: "L-2", label: "Linha 2", properties: {} },
      a: { id: "a", sourcePortId: "b", targetPortId: "a", connectionClass: "process", route: [], tag: "L-1", label: "Linha 1", properties: {} },
    },
    annotations: {
      b: { id: "b", kind: "note", text: "B", x: 0, y: 0, width: 20, height: 20, rotation: 0, properties: {} },
      a: { id: "a", kind: "text", text: "A", x: 0, y: 0, width: 20, height: 20, rotation: 0, properties: {} },
    },
    groups: {
      b: { id: "b", label: "B", memberIds: ["a"], x: 0, y: 0, width: 20, height: 20, properties: {} },
      a: { id: "a", label: "A", memberIds: ["a"], x: 0, y: 0, width: 20, height: 20, properties: {} },
    },
  };

  const projection = projectPidDocument(document);

  expect(projection).toMatchObject({ id: document.id, metadata: document.metadata });
  expect(projection.nodes.map(({ id }) => id)).toEqual(["a", "b"]);
  expect(projection.ports.map(({ id }) => id)).toEqual(["a", "b"]);
  expect(projection.edges.map(({ id }) => id)).toEqual(["a", "b"]);
  expect(projection.annotations.map(({ id }) => id)).toEqual(["a", "b"]);
  expect(projection.groups.map(({ id }) => id)).toEqual(["a", "b"]);
  expect("viewport" in projection).toBe(false);
  expect("selection" in projection).toBe(false);
});
