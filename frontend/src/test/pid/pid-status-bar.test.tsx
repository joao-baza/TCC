import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBar } from "@/features/pid/editor/status-bar";
import type { EditorState } from "@/features/pid/editor/editor-store";

const baseState: EditorState = Object.freeze({
  document: Object.freeze({
    schemaVersion: 1 as const,
    id: "test",
    metadata: { title: "Test", standard: "free" as const, catalogVersion: "1", createdAt: "", updatedAt: "" },
    nodes: {}, ports: {}, edges: {}, annotations: {}, groups: {},
  }),
  past: Object.freeze([]),
  future: Object.freeze([]),
  selection: Object.freeze([]),
  viewport: Object.freeze({ x: 0, y: 0, zoom: 1 }),
  validationErrors: 0,
  validationWarnings: 0,
} as unknown as EditorState);

describe("StatusBar", () => {
  it("shows dynamic validation counts", () => {
    render(<StatusBar state={baseState} validationCounts={{ errors: 3, warnings: 1 }} />);
    expect(screen.getByText(/Avisos 1/)).toBeInTheDocument();
    expect(screen.getByText(/Erros 3/)).toBeInTheDocument();
  });

  it("shows zero counts when no issues", () => {
    render(<StatusBar state={baseState} validationCounts={{ errors: 0, warnings: 0 }} />);
    expect(screen.getByText(/Avisos 0/)).toBeInTheDocument();
    expect(screen.getByText(/Erros 0/)).toBeInTheDocument();
  });

});
