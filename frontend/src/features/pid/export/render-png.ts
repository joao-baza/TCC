export interface PidPngOptions {
  readonly background?: "white" | "transparent";
}

export interface PidPngRuntime {
  readonly devicePixelRatio: number;
  readonly createImage: () => HTMLImageElement;
  readonly createCanvas: () => HTMLCanvasElement;
  readonly createObjectURL: (blob: Blob) => string;
  readonly revokeObjectURL: (url: string) => void;
}

const pngFailureMessage = "Não foi possível gerar PNG";
const maximumCanvasDimension = 32_767;
const maximumCanvasPixels = 64 * 1024 * 1024;

export async function renderPidPng(
  svg: string,
  options: PidPngOptions = {},
  runtime: PidPngRuntime = browserPngRuntime(),
): Promise<Blob> {
  const dimensions = svgDimensions(svg);
  if (!dimensions) throw new Error(pngFailureMessage);
  const dpr = Math.min(2, Math.max(1, finiteOr(runtime.devicePixelRatio, 1)));
  const pixelWidth = Math.max(1, Math.ceil(dimensions.width * dpr));
  const pixelHeight = Math.max(1, Math.ceil(dimensions.height * dpr));
  if (pixelWidth > maximumCanvasDimension
    || pixelHeight > maximumCanvasDimension
    || pixelWidth * pixelHeight > maximumCanvasPixels) throw new Error(pngFailureMessage);
  const image = runtime.createImage();
  const canvas = runtime.createCanvas();
  canvas.width = pixelWidth;
  canvas.height = pixelHeight;
  const svgUrl = runtime.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));

  try {
    await loadImage(image, svgUrl);
    const context = canvas.getContext("2d");
    if (!context) throw new Error(pngFailureMessage);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    if ((options.background ?? "transparent") === "white") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, dimensions.width, dimensions.height);
    }
    context.drawImage(image, 0, 0, dimensions.width, dimensions.height);
    return await canvasBlob(canvas);
  } catch {
    throw new Error(pngFailureMessage);
  } finally {
    image.onload = null;
    image.onerror = null;
    image.src = "";
    runtime.revokeObjectURL(svgUrl);
  }
}

function svgDimensions(svg: string): { width: number; height: number } | null {
  const match = /<svg\b[^>]*\bviewBox\s*=\s*["']\s*([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s*["']/u.exec(svg);
  if (!match) return null;
  const width = Number(match[3]);
  const height = Number(match[4]);
  return Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0
    ? { width, height }
    : null;
}

function loadImage(image: HTMLImageElement, url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(pngFailureMessage));
    image.src = url;
  });
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error(pngFailureMessage)), "image/png");
    } catch {
      reject(new Error(pngFailureMessage));
    }
  });
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function browserPngRuntime(): PidPngRuntime {
  return {
    devicePixelRatio: window.devicePixelRatio,
    createImage: () => new Image(),
    createCanvas: () => document.createElement("canvas"),
    createObjectURL: (blob) => URL.createObjectURL(blob),
    revokeObjectURL: (url) => URL.revokeObjectURL(url),
  };
}
