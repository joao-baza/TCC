export type PidExportExtension = "svg" | "png";

interface DownloadAnchor {
  href: string;
  download: string;
  click(): void;
  remove(): void;
}

export interface BlobDownloadRuntime {
  readonly createObjectURL: (blob: Blob) => string;
  readonly revokeObjectURL: (url: string) => void;
  readonly createAnchor: () => DownloadAnchor;
  readonly scheduleCleanup: (callback: () => void) => void;
}

export function pidExportFilename(title: string, extension: PidExportExtension): string {
  const stem = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
  return `${stem || "diagrama-pid"}.${extension}`;
}

export function downloadBlob(
  blob: Blob,
  filename: string,
  runtime: BlobDownloadRuntime = browserDownloadRuntime(),
): void {
  const url = runtime.createObjectURL(blob);
  let anchor: DownloadAnchor | null = null;
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    anchor?.remove();
    runtime.revokeObjectURL(url);
  };
  try {
    anchor = runtime.createAnchor();
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    runtime.scheduleCleanup(cleanup);
  } catch (error) {
    cleanup();
    throw error;
  }
}

function browserDownloadRuntime(): BlobDownloadRuntime {
  return {
    createObjectURL: (blob) => URL.createObjectURL(blob),
    revokeObjectURL: (url) => URL.revokeObjectURL(url),
    createAnchor: () => {
      const anchor = document.createElement("a");
      anchor.hidden = true;
      document.body.append(anchor);
      return anchor;
    },
    scheduleCleanup: (callback) => { window.setTimeout(callback, 0); },
  };
}
