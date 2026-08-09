import { defineConfig, mergeConfig, type UserConfig } from "vitest/config";

import viteConfig from "./vite.config";

export default defineConfig((environment) => {
  const resolvedViteConfig = typeof viteConfig === "function"
    ? viteConfig(environment)
    : viteConfig;
  return mergeConfig(
    resolvedViteConfig as UserConfig,
    {
      test: {
        environment: "jsdom",
        globals: true,
        setupFiles: "./src/test/setup.ts",
        include: ["src/test/**/*.test.{ts,tsx}"],
        exclude: ["tests/e2e/**"],
      },
    },
  );
});
