import "@testing-library/jest-dom/vitest";

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
