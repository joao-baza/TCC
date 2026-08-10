import type { ReactNode } from "react";

export function PidThemeProvider({ children }: { children: ReactNode }) {
  return <div className="dark bg-background text-foreground">{children}</div>;
}
