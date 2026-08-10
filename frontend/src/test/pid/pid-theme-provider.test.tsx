import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PidThemeProvider } from "@/features/pid/editor/pid-theme-provider";

describe("PidThemeProvider", () => {
  it("wraps children in a dark container", () => {
    render(<PidThemeProvider><span data-testid="child">content</span></PidThemeProvider>);
    const wrapper = screen.getByTestId("child").parentElement!;
    expect(wrapper.className).toContain("dark");
    expect(wrapper.className).toContain("bg-background");
    expect(wrapper.className).toContain("text-foreground");
  });
});
