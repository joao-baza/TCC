import { defineConfig } from "vitest/config";
import path from "node:path";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["src/test/**/*.test.ts", "src/test/**/*.test.tsx"],
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"]
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
});
