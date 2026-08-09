import "@testing-library/jest-dom/vitest";

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class ResizeObserver {
    readonly #callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.#callback = callback;
    }

    observe(target: Element) {
      if (target.classList.contains("react-flow__node")) return;
      this.#callback([{
        target,
        contentRect: target.getBoundingClientRect(),
        borderBoxSize: [],
        contentBoxSize: [],
        devicePixelContentBoxSize: [],
      }] as unknown as ResizeObserverEntry[], this);
    }
    unobserve() {}
    disconnect() {}
  };
}

if (!globalThis.DOMMatrixReadOnly) {
  globalThis.DOMMatrixReadOnly = class DOMMatrixReadOnly {
    readonly m22 = 1;
  } as typeof DOMMatrixReadOnly;
}

// ResizeObserver enables Base UI's overflow observer branch in jsdom.
if (!Element.prototype.getAnimations) {
  Element.prototype.getAnimations = () => [];
}

const nativeGetBoundingClientRect = Element.prototype.getBoundingClientRect;
Element.prototype.getBoundingClientRect = function getBoundingClientRect() {
  const measured = nativeGetBoundingClientRect.call(this);
  if (measured.width || measured.height || !(this instanceof HTMLElement)) return measured;
  const canvas = this.closest<HTMLElement>("[data-testid='pid-canvas']");
  if (!canvas) return measured;
  const pixelSize = (value: string) => value.endsWith("px") ? Number.parseFloat(value) : 0;
  const width = pixelSize(this.style.width) || pixelSize(canvas.style.width) || 1024;
  const height = pixelSize(this.style.height) || pixelSize(canvas.style.height) || 640;
  return DOMRect.fromRect({ x: 0, y: 0, width, height });
};

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

if (!navigator.locks) {
  const tails = new Map<string, Promise<void>>();
  Object.defineProperty(navigator, "locks", {
    configurable: true,
    value: {
      request: async <T>(
        name: string,
        optionsOrCallback: LockOptions | (() => Promise<T>),
        maybeCallback?: () => Promise<T>,
      ): Promise<T> => {
        const callback = typeof optionsOrCallback === "function" ? optionsOrCallback : maybeCallback!;
        const previous = tails.get(name) ?? Promise.resolve();
        let release: () => void = () => undefined;
        const current = new Promise<void>((resolve) => { release = resolve; });
        const tail = previous.then(() => current);
        tails.set(name, tail);
        await previous;
        try {
          return await callback();
        } finally {
          release();
          if (tails.get(name) === tail) tails.delete(name);
        }
      },
    },
  });
}
