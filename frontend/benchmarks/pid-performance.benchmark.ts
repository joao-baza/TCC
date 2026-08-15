import { performance } from "node:perf_hooks";

import { describe, expect, it } from "vitest";

import { projectPidCanvasDocument } from "@/features/pid/canvas/flow-projection";
import { validateDocument } from "@/features/pid/domain/validation";
import { applyCommand, moveSelection, renameDocument, type CommandContext } from "@/features/pid/domain/commands";
import { renderPidSvg } from "@/features/pid/export/render-svg";
import {
  createPidCommandReferenceDocument,
  createPidPerformanceDocument,
  onPidPerformancePortKey,
  pidPerformanceAssets,
  pidPerformanceCatalog,
  pidPerformanceSymbols,
} from "@/test/pid/pid-performance-fixture";

const warmupRuns = 2;
const measuredRuns = 3;
const budgets = {
  projection: { medianMs: 100, maxMs: 200 },
  validation: { medianMs: 200, maxMs: 400 },
  svg: { medianMs: 500, maxMs: 1_000 },
  commands: { medianMs: 750, maxMs: 1_000 },
} as const;

interface Measurement {
  readonly projection: number;
  readonly validation: number;
  readonly svg: number;
  readonly commands: number;
}

describe("benchmark isolado do editor P&ID", () => {
  it("cumpre os orçamentos explícitos para 500 nós e 1.000 conexões", async () => {
    for (let index = 0; index < warmupRuns; index += 1) await measure();
    const samples: Measurement[] = [];
    for (let index = 0; index < measuredRuns; index += 1) samples.push(await measure());

    for (const operation of Object.keys(budgets) as (keyof Measurement)[]) {
      const durations = samples.map((sample) => sample[operation]);
      const medianMs = median(durations);
      const maxMs = Math.max(...durations);
      const budget = budgets[operation];
      console.info(
        `${operation}: median=${medianMs.toFixed(2)}ms max=${maxMs.toFixed(2)}ms `
          + `(budgets median<${budget.medianMs}ms max<${budget.maxMs}ms)`,
      );
      expect(medianMs, `${operation} excedeu o orçamento mediano`).toBeLessThan(budget.medianMs);
      expect(maxMs, `${operation} excedeu o orçamento máximo`).toBeLessThan(budget.maxMs);
    }
  }, 15_000);
});

async function measure(): Promise<Measurement> {
  const document = createPidPerformanceDocument();
  const projectionStart = performance.now();
  projectPidCanvasDocument(document, pidPerformanceSymbols, true, onPidPerformancePortKey);
  const projection = performance.now() - projectionStart;

  const validationStart = performance.now();
  const issues = validateDocument(document, { catalog: pidPerformanceCatalog });
  const validation = performance.now() - validationStart;

  const svgStart = performance.now();
  await renderPidSvg(document, pidPerformanceAssets);
  const svg = performance.now() - svgStart;
  expect(issues).toEqual([]);

  let commandDocument = createPidCommandReferenceDocument();
  const firstNodeId = Object.keys(commandDocument.nodes)[0];
  let tick = 0;
  const context: CommandContext = {
    generateId: () => { throw new Error("Não deveria gerar IDs."); },
    now: () => new Date(1_800_000_000_000 + tick++),
  };
  const commandsStart = performance.now();
  for (let index = 0; index < 50; index += 1) {
    commandDocument = applyCommand(commandDocument, renameDocument(`Referência ${index}`), context);
    commandDocument = applyCommand(commandDocument, moveSelection([firstNodeId], { x: 1, y: 0 }), context);
  }
  const commands = performance.now() - commandsStart;
  expect(commandDocument.nodes[firstNodeId].x).toBe(50);
  expect(commandDocument.metadata.title).toBe("Referência 49");

  return { projection, validation, svg, commands };
}

function median(values: readonly number[]): number {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.floor(ordered.length / 2)];
}
