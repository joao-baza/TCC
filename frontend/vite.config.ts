import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const environment = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  if (!["local", "remote", "disabled"].includes(environment.VITE_PID_ADAPTER)) {
    throw new Error("Adaptador P&ID não configurado");
  }
  const pidRouteEntry = environment.VITE_PID_ADAPTER === "disabled"
    ? "./src/features/pid/routing/pid-route-disabled.tsx"
    : "./src/features/pid/routing/pid-route-local.tsx";

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: [
        {
          find: "@/features/pid/routing/active-pid-route",
          replacement: path.resolve(__dirname, pidRouteEntry),
        },
        { find: "@", replacement: path.resolve(__dirname, "./src") },
      ],
    },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) {
              return undefined;
            }

            if (id.includes("@xyflow/react") || id.includes("@tanstack/react-virtual")) {
              return "pid-editor";
            }

            if (id.includes("recharts") || id.includes("d3-")) {
              return "charts";
            }

            if (id.includes("katex") || id.includes("react-katex")) {
              return "math";
            }

            return "vendor";
          },
        },
      },
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
      proxy: {
        "/api": {
          target: "http://localhost:5000",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, "")
        }
      }
    }
  };
});
