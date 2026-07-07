import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const sonnerState = vi.hoisted(() => ({
  props: [] as Array<Record<string, unknown>>,
}));

vi.mock("sonner", () => ({
  Toaster: (props: Record<string, unknown>) => {
    sonnerState.props.push(props);
    return <div data-testid="sonner" />;
  },
}));

import { Toaster } from "@/components/ui/sonner";

function mockMatchMedia(matches: boolean) {
  return vi.spyOn(window, "matchMedia").mockImplementation((query: string) => {
    const mediaQueryList = {
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }

    return mediaQueryList as unknown as MediaQueryList;
  });
}

afterEach(() => {
  sonnerState.props.length = 0;
  vi.restoreAllMocks();
});

describe("Toaster", () => {
  it("uses top-right on desktop", async () => {
    mockMatchMedia(false);

    render(<Toaster />);

    await waitFor(() => {
      expect(sonnerState.props.at(-1)).toMatchObject({
        position: "top-right",
        toastOptions: {
          classNames: {
            toast: expect.stringContaining("backdrop-blur-md"),
            info: expect.stringContaining("hsl(var(--primary)/0.10)"),
            error: expect.stringContaining("bg-rose-50"),
          },
        },
      });
    });
  });

  it("uses top-center on mobile", async () => {
    mockMatchMedia(true);

    render(<Toaster />);

    await waitFor(() => {
      expect(sonnerState.props.at(-1)).toMatchObject({
        position: "top-center",
        toastOptions: {
          classNames: {
            warning: expect.stringContaining("bg-amber-50"),
          },
        },
      });
    });
  });
});
