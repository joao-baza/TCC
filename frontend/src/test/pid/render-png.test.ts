import { describe, expect, it, vi } from "vitest";

import { renderPidPng, type PidPngRuntime } from "@/features/pid/export/render-png";

const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -20 100 50"></svg>';

describe("renderPidPng", () => {
  it("rasteriza nas dimensões do viewBox com DPR limitado a 2 e fundo branco", async () => {
    const harness = pngHarness({ dpr: 4 });
    const promise = renderPidPng(svg, { background: "white" }, harness.runtime);
    harness.image.onload?.(new Event("load"));
    const result = await promise;

    expect(result).toBe(harness.output);
    expect(harness.canvas.width).toBe(200);
    expect(harness.canvas.height).toBe(100);
    expect(harness.context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
    expect(harness.context.fillRect).toHaveBeenCalledWith(0, 0, 100, 50);
    expect(harness.context.drawImage).toHaveBeenCalledWith(harness.image, 0, 0, 100, 50);
    expect(harness.runtime.revokeObjectURL).toHaveBeenCalledWith("blob:svg");
    expect(harness.image.src).toBe("");
  });

  it("preserva transparência e respeita DPR fracionário", async () => {
    const harness = pngHarness({ dpr: 1.5 });
    const promise = renderPidPng(svg, { background: "transparent" }, harness.runtime);
    harness.image.onload?.(new Event("load"));
    await promise;
    expect(harness.canvas.width).toBe(150);
    expect(harness.canvas.height).toBe(75);
    expect(harness.context.fillRect).not.toHaveBeenCalled();
  });

  it("falha com mensagem exata e sempre limpa URL e imagem", async () => {
    const harness = pngHarness({ dpr: 1 });
    const promise = renderPidPng(svg, {}, harness.runtime);
    harness.image.onerror?.(new Event("error"));

    await expect(promise).rejects.toThrow("Não foi possível gerar PNG");
    expect(harness.runtime.revokeObjectURL).toHaveBeenCalledWith("blob:svg");
    expect(harness.image.src).toBe("");
  });

  it("trata falha de canvas e toBlob nulo sem vazar a URL", async () => {
    const noContext = pngHarness({ dpr: 1, context: null });
    const contextPromise = renderPidPng(svg, {}, noContext.runtime);
    noContext.image.onload?.(new Event("load"));
    await expect(contextPromise).rejects.toThrow("Não foi possível gerar PNG");
    expect(noContext.runtime.revokeObjectURL).toHaveBeenCalledOnce();

    const noBlob = pngHarness({ dpr: 1, blob: null });
    const blobPromise = renderPidPng(svg, {}, noBlob.runtime);
    noBlob.image.onload?.(new Event("load"));
    await expect(blobPromise).rejects.toThrow("Não foi possível gerar PNG");
    expect(noBlob.runtime.revokeObjectURL).toHaveBeenCalledOnce();
  });

  it("rejeita SVG sem dimensões positivas antes de criar URL", async () => {
    const harness = pngHarness({ dpr: 1 });
    await expect(renderPidPng('<svg viewBox="0 0 0 10"></svg>', {}, harness.runtime)).rejects.toThrow("Não foi possível gerar PNG");
    expect(harness.runtime.createObjectURL).not.toHaveBeenCalled();
  });

  it("rejeita dimensões que excedem o limite seguro do canvas", async () => {
    const harness = pngHarness({ dpr: 2 });
    const promise = renderPidPng('<svg viewBox="0 0 100000 100000"></svg>', {}, harness.runtime);
    harness.image.onerror?.(new Event("error"));
    await expect(promise).rejects.toThrow("Não foi possível gerar PNG");
    expect(harness.runtime.createObjectURL).not.toHaveBeenCalled();
  });

  it("reduz proporcionalmente um diagrama 4096x4096 no DPR 2 para um orçamento móvel seguro", async () => {
    const harness = pngHarness({ dpr: 2 });
    const promise = renderPidPng('<svg viewBox="0 0 4096 4096"></svg>', {}, harness.runtime);
    harness.image.onload?.(new Event("load"));
    await promise;

    expect(harness.canvas.width).toBe(harness.canvas.height);
    expect(harness.canvas.width * harness.canvas.height).toBeLessThanOrEqual(8 * 1024 * 1024);
    expect(harness.canvas.width).toBeLessThan(4096);
    const effectiveScale = vi.mocked(harness.context.setTransform).mock.calls[0][0];
    expect(effectiveScale).toBeGreaterThanOrEqual(0.1);
    expect(effectiveScale).toBeLessThan(1);
    expect(harness.context.drawImage).toHaveBeenCalledWith(harness.image, 0, 0, 4096, 4096);
    expect(harness.runtime.revokeObjectURL).toHaveBeenCalledOnce();
    expect(harness.image.src).toBe("");
  });

  it("rejeita redução extrema antes de alocar recursos do navegador", async () => {
    const harness = pngHarness({ dpr: 2 });
    await expect(renderPidPng('<svg viewBox="0 0 1000000000 1000000000"></svg>', {}, harness.runtime)).rejects.toThrow("Não foi possível gerar PNG");
    expect(harness.runtime.createImage).not.toHaveBeenCalled();
    expect(harness.runtime.createCanvas).not.toHaveBeenCalled();
    expect(harness.runtime.createObjectURL).not.toHaveBeenCalled();
    expect(harness.runtime.revokeObjectURL).not.toHaveBeenCalled();
  });
});

function pngHarness(options: { dpr: number; context?: CanvasRenderingContext2D | null; blob?: Blob | null }) {
  const output = options.blob === undefined ? new Blob(["png"], { type: "image/png" }) : options.blob;
  const context = options.context === undefined ? {
    setTransform: vi.fn(), fillRect: vi.fn(), drawImage: vi.fn(), fillStyle: "",
  } as unknown as CanvasRenderingContext2D : options.context;
  const image = { src: "", onload: null, onerror: null } as unknown as HTMLImageElement;
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
    toBlob: vi.fn((callback: BlobCallback) => callback(output)),
  } as unknown as HTMLCanvasElement;
  const runtime: PidPngRuntime = {
    devicePixelRatio: options.dpr,
    createImage: vi.fn(() => image),
    createCanvas: vi.fn(() => canvas),
    createObjectURL: vi.fn(() => "blob:svg"),
    revokeObjectURL: vi.fn(),
  };
  return { runtime, image, canvas, context: context!, output };
}
