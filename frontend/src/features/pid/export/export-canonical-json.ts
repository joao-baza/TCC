import type { PidDocument } from "../domain/model";

interface DownloadAnchor {
  download: string;
  href: string;
  click(): void;
  remove(): void;
}

export interface CanonicalJsonDownloadRuntime {
  readonly createObjectURL: (blob: Blob) => string;
  readonly revokeObjectURL: (url: string) => void;
  readonly createAnchor: () => DownloadAnchor;
}

export function serializeCanonicalPidJson(document: PidDocument): string {
  return `${JSON.stringify(sortJsonValue(document), null, 2)}\n`;
}

export function downloadCanonicalPidJson(
  document: PidDocument,
  runtime: CanonicalJsonDownloadRuntime = browserDownloadRuntime(),
): string {
  const filename = `${safeFilenameStem(document.metadata.title)}.pid.json`;
  const blob = new Blob([serializeCanonicalPidJson(document)], { type: "application/json" });
  const url = runtime.createObjectURL(blob);
  const anchor = runtime.createAnchor();
  try {
    anchor.download = filename;
    anchor.href = url;
    anchor.click();
  } finally {
    anchor.remove();
    runtime.revokeObjectURL(url);
  }
  return filename;
}

function browserDownloadRuntime(): CanonicalJsonDownloadRuntime {
  return {
    createObjectURL: (blob) => URL.createObjectURL(blob),
    revokeObjectURL: (url) => URL.revokeObjectURL(url),
    createAnchor: () => {
      const anchor = document.createElement("a");
      anchor.hidden = true;
      document.body.append(anchor);
      return anchor;
    },
  };
}

function safeFilenameStem(title: string): string {
  const stem = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
  return stem || "diagrama-pid";
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort(compareCodeUnits)
      .map((key) => [key, sortJsonValue((value as Record<string, unknown>)[key])]),
  );
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
