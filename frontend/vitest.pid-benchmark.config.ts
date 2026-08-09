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
        include: ["benchmarks/pid-performance.benchmark.ts"],
        pool: "forks",
        minWorkers: 1,
        maxWorkers: 1,
        fileParallelism: false,
        sequence: { concurrent: false },
      },
    },
  );
});
