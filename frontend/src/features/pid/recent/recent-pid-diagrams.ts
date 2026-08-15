import { z } from "zod";

import type { AccessScope, PidRecentDiagramsPort } from "../api/contracts";

export const recentPidDiagramsStorageKey = "dcou.pid.recent.v1";
export const recentPidDiagramsLimit = 50;

const uuidSchema = z.string().uuid();
const recentPidDiagramInputSchema = z.object({
  diagramId: uuidSchema,
  title: z.string().trim().min(1),
  scope: z.enum(["edit", "view"]),
  url: z.string().trim().min(1),
}).strict().refine((item) => isSafeRecentUrl(item.url, item.diagramId), {
  message: "URL recente inválida.",
  path: ["url"],
});
const recentPidDiagramSchema = recentPidDiagramInputSchema.extend({
  lastOpenedAt: z.string().datetime({ offset: true }),
}).strict().refine((item) => isSafeRecentUrl(item.url, item.diagramId), {
  message: "URL recente inválida.",
  path: ["url"],
});

const recentPidDiagramIndexSchema = z.object({
  version: z.literal(1),
  items: z.array(z.unknown()),
}).strict();

export type RecentPidDiagram = z.infer<typeof recentPidDiagramSchema>;

export interface UpsertRecentPidDiagramInput {
  readonly diagramId: string;
  readonly title: string;
  readonly scope: AccessScope;
  readonly url: string;
}

export class LocalRecentPidDiagrams implements PidRecentDiagramsPort {
  constructor(
    private readonly storage: Storage,
    private readonly now: () => Date,
  ) {}

  list(): RecentPidDiagram[] {
    return sortRecentItems(this.readIndex());
  }

  upsert(input: UpsertRecentPidDiagramInput): void {
    const parsed = recentPidDiagramInputSchema.safeParse(input);
    if (!parsed.success) return;
    const timestamp = this.readNowIso();
    const existing = this.readIndex();
    const previous = existing.find((item) => item.diagramId === parsed.data.diagramId);
    const nextItem: RecentPidDiagram = previous?.scope === "edit" && parsed.data.scope === "view"
      ? { ...previous, title: parsed.data.title, lastOpenedAt: timestamp }
      : { ...parsed.data, lastOpenedAt: timestamp };
    const next = [
      nextItem,
      ...existing.filter((item) => item.diagramId !== nextItem.diagramId),
    ].sort((left, right) => right.lastOpenedAt.localeCompare(left.lastOpenedAt))
      .slice(0, recentPidDiagramsLimit);
    this.writeIndex(next);
  }

  private readIndex(): RecentPidDiagram[] {
    let serialized: string | null;
    try {
      serialized = this.storage.getItem(recentPidDiagramsStorageKey);
    } catch {
      return [];
    }
    if (serialized === null || serialized.length > 256 * 1024) return [];
    try {
      const parsed = recentPidDiagramIndexSchema.safeParse(JSON.parse(serialized));
      return parsed.success
        ? parsed.data.items.flatMap((item) => {
          const parsedItem = recentPidDiagramSchema.safeParse(item);
          return parsedItem.success ? [parsedItem.data] : [];
        })
        : [];
    } catch {
      return [];
    }
  }

  private writeIndex(items: RecentPidDiagram[]): void {
    try {
      this.storage.setItem(recentPidDiagramsStorageKey, JSON.stringify({ version: 1, items }));
    } catch {
      return;
    }
  }

  private readNowIso(): string {
    try {
      const value = this.now();
      if (!(value instanceof Date) || !Number.isFinite(value.getTime())) throw new Error("Relógio inválido.");
      return value.toISOString();
    } catch {
      return new Date().toISOString();
    }
  }
}

function sortRecentItems(items: RecentPidDiagram[]): RecentPidDiagram[] {
  return [...items].sort((left, right) => right.lastOpenedAt.localeCompare(left.lastOpenedAt));
}

function isSafeRecentUrl(value: string, diagramId: string): boolean {
  try {
    const url = new URL(value, "http://local.pid");
    return url.pathname === `/pid/${diagramId}`
      && Boolean(url.hash.match(/^#access=[A-Za-z0-9_-]+$/));
  } catch {
    return false;
  }
}
