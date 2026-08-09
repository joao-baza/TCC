export function installPidCanvasGeometryHarness(): () => void {
  const previousResizeObserver = globalThis.ResizeObserver;
  const previousGetBoundingClientRect = Element.prototype.getBoundingClientRect;

  globalThis.ResizeObserver = class ResizeObserver {
    readonly #callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.#callback = callback;
    }

    observe(target: Element) {
      const contentRect = target.getBoundingClientRect();
      this.#callback([{
        target,
        contentRect,
        borderBoxSize: [{ inlineSize: contentRect.width, blockSize: contentRect.height }],
        contentBoxSize: [{ inlineSize: contentRect.width, blockSize: contentRect.height }],
        devicePixelContentBoxSize: [],
      }] as unknown as ResizeObserverEntry[], this);
    }

    unobserve() {}
    disconnect() {}
  };

  Element.prototype.getBoundingClientRect = function getBoundingClientRect() {
    const measured = previousGetBoundingClientRect.call(this);
    if (!(this instanceof HTMLElement)) return measured;
    const canvas = this.closest<HTMLElement>("[data-testid='pid-canvas']");
    if (!canvas && !this.matches("[data-testid='pid-canvas']")) return measured;
    if (this.matches("[data-testid='pid-canvas'], [data-testid='rf__wrapper'], .react-flow__renderer, .react-flow__pane")) {
      return DOMRect.fromRect({ x: 0, y: 0, width: 1024, height: 640 });
    }
    if (this.classList.contains("react-flow__node")) return nodeRect(this);
    if (this.classList.contains("react-flow__handle")) return handleRect(this);
    const width = pixels(this.style.width) || measured.width;
    const height = pixels(this.style.height) || measured.height;
    return width || height ? DOMRect.fromRect({ x: 0, y: 0, width, height }) : measured;
  };

  return () => {
    Element.prototype.getBoundingClientRect = previousGetBoundingClientRect;
    globalThis.ResizeObserver = previousResizeObserver;
  };
}

function nodeRect(node: HTMLElement): DOMRect {
  const match = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(node.style.transform);
  return DOMRect.fromRect({
    x: Number(match?.[1] ?? 0),
    y: Number(match?.[2] ?? 0),
    width: pixels(node.style.width),
    height: pixels(node.style.height),
  });
}

function handleRect(handle: HTMLElement): DOMRect {
  const node = handle.closest<HTMLElement>(".react-flow__node");
  const parent = node ? nodeRect(node) : DOMRect.fromRect();
  const width = pixels(handle.style.width) || 44;
  const height = pixels(handle.style.height) || 44;
  const centerX = handle.style.right
    ? parent.width - pixels(handle.style.right)
    : pixels(handle.style.left);
  const centerY = handle.style.bottom
    ? parent.height - pixels(handle.style.bottom)
    : pixels(handle.style.top);
  return DOMRect.fromRect({
    x: parent.x + centerX - width / 2,
    y: parent.y + centerY - height / 2,
    width,
    height,
  });
}

function pixels(value: string): number {
  return value.endsWith("px") ? Number.parseFloat(value) : 0;
}
