import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(process.cwd(), "..");
const read = (path: string) => readFileSync(resolve(repositoryRoot, path), "utf8");

describe("configuração rastreada do adaptador P&ID", () => {
  it.each(["development", "test", "production"])("seleciona local explicitamente no modo %s", (mode) => {
    expect(read(`frontend/.env.${mode}`)).toMatch(/^VITE_PID_ADAPTER=local\s*$/m);
  });

  it("documenta a seleção no exemplo de ambiente", () => {
    expect(read(".env.example")).toMatch(/^VITE_PID_ADAPTER=local\s*$/m);
  });

  it("injeta e valida o adaptador antes do build Docker", () => {
    const dockerfile = read("deploy/Dockerfile.frontend");
    expect(dockerfile).toMatch(/ARG VITE_PID_ADAPTER(?:=local)?/);
    expect(dockerfile).toContain("ENV VITE_PID_ADAPTER=${VITE_PID_ADAPTER}");
    expect(dockerfile.indexOf("ARG VITE_PID_ADAPTER")).toBeLessThan(dockerfile.indexOf("RUN npm run build"));
    expect(dockerfile).toContain('test "$VITE_PID_ADAPTER" = "local"');
  });

  it("fornece local explicitamente no build do compose", () => {
    const compose = read("deploy/docker-compose.yaml");
    expect(compose).toMatch(/tcc-frontend:[\s\S]*args:\s*\n\s*VITE_PID_ADAPTER: local/);
  });

  it("mantém validação de build sem fallback para valor ausente ou não suportado", () => {
    const viteConfig = read("frontend/vite.config.ts");
    expect(viteConfig).toContain("loadEnv");
    expect(viteConfig).toContain("Adaptador P&ID não configurado");
  });
});
