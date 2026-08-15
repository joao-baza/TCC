import { describe, expect, it, vi } from "vitest";

import { downloadCanonicalPidJson, serializeCanonicalPidJson } from "@/features/pid/export/export-canonical-json";
import { createEmptyDocument } from "@/features/pid/domain/schema";

const document = createEmptyDocument(
  { title: "Área 100 / Bombas", standard: "free" },
  {
    generateId: () => "91000000-0000-4000-8000-000000000001",
    now: () => new Date("2026-08-09T12:00:00.000Z"),
  },
);

describe("exportação canônica JSON temporária", () => {
  it("serializa deterministicamente sem alterar o documento", () => {
    const before = structuredClone(document);
    const first = serializeCanonicalPidJson(document);
    const second = serializeCanonicalPidJson(structuredClone(document));

    expect(second).toBe(first);
    expect(JSON.parse(first)).toEqual(document);
    expect(document).toEqual(before);
  });

  it("baixa Blob JSON com nome seguro e revoga a URL", () => {
    const click = vi.fn();
    const remove = vi.fn();
    const runtime = {
      createObjectURL: vi.fn().mockReturnValue("blob:canonical"),
      revokeObjectURL: vi.fn(),
      createAnchor: vi.fn().mockReturnValue({ click, remove, download: "", href: "" }),
    };

    expect(downloadCanonicalPidJson(document, runtime)).toBe("area-100-bombas.pid.json");
    const blob = runtime.createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(blob.type).toBe("application/json");
    expect(runtime.createAnchor.mock.results[0]?.value).toMatchObject({
      download: "area-100-bombas.pid.json",
      href: "blob:canonical",
    });
    expect(click).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(runtime.revokeObjectURL).toHaveBeenCalledWith("blob:canonical");
  });
});
