import { describe, expect, it, vi } from "vitest";

import { downloadBlob, pidExportFilename, type BlobDownloadRuntime } from "@/features/pid/export/download";

describe("pidExportFilename", () => {
  it("normaliza Unicode e separadores para slug ASCII", () => {
    expect(pidExportFilename("Área 100 / Bombas", "svg")).toBe("area-100-bombas.svg");
    expect(pidExportFilename("化学 🧪 — Δ", "png")).toBe("diagrama-pid.png");
  });

  it("limita o stem e mantém extensão determinística", () => {
    const filename = pidExportFilename(`  ${"A".repeat(200)} fim  `, "svg");
    expect(filename).toMatch(/^[a]{96}\.svg$/);
  });
});

describe("downloadBlob", () => {
  it("aciona download e agenda revogação sem invalidar a URL prematuramente", () => {
    const order: string[] = [];
    const anchor = { href: "", download: "", click: vi.fn(() => order.push("click")), remove: vi.fn(() => order.push("remove")) };
    let scheduled: (() => void) | undefined;
    const runtime: BlobDownloadRuntime = {
      createObjectURL: vi.fn(() => "blob:download"),
      revokeObjectURL: vi.fn(() => order.push("revoke")),
      createAnchor: vi.fn(() => anchor),
      scheduleCleanup: vi.fn((callback) => { scheduled = callback; order.push("scheduled"); }),
    };

    downloadBlob(new Blob(["x"]), "diagrama.svg", runtime);
    expect(anchor).toMatchObject({ href: "blob:download", download: "diagrama.svg" });
    expect(order).toEqual(["click", "scheduled"]);
    expect(anchor.remove).not.toHaveBeenCalled();
    scheduled?.();
    expect(order).toEqual(["click", "scheduled", "remove", "revoke"]);
  });

  it("limpa imediatamente quando o click falha", () => {
    const anchor = { href: "", download: "", click: vi.fn(() => { throw new Error("blocked"); }), remove: vi.fn() };
    const runtime: BlobDownloadRuntime = {
      createObjectURL: vi.fn(() => "blob:download"), revokeObjectURL: vi.fn(), createAnchor: vi.fn(() => anchor), scheduleCleanup: vi.fn(),
    };
    expect(() => downloadBlob(new Blob(), "diagrama.svg", runtime)).toThrow("blocked");
    expect(anchor.remove).toHaveBeenCalledOnce();
    expect(runtime.revokeObjectURL).toHaveBeenCalledWith("blob:download");
    expect(runtime.scheduleCleanup).not.toHaveBeenCalled();
  });

  it("revoga a URL mesmo quando não consegue criar o link", () => {
    const runtime: BlobDownloadRuntime = {
      createObjectURL: vi.fn(() => "blob:download"), revokeObjectURL: vi.fn(),
      createAnchor: vi.fn(() => { throw new Error("sem DOM"); }), scheduleCleanup: vi.fn(),
    };
    expect(() => downloadBlob(new Blob(), "diagrama.svg", runtime)).toThrow("sem DOM");
    expect(runtime.revokeObjectURL).toHaveBeenCalledWith("blob:download");
  });
});
