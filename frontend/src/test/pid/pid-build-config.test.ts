import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(process.cwd(), "..");
const read = (path: string) => readFileSync(resolve(repositoryRoot, path), "utf8");

describe("configuração rastreada do adaptador P&ID", () => {
  it.each(["development", "test"])("seleciona local explicitamente no modo %s", (mode) => {
    expect(read(`frontend/.env.${mode}`)).toMatch(/^VITE_PID_ADAPTER=local\s*$/m);
  });

  it("desabilita explicitamente P&ID no ambiente de produção", () => {
    expect(existsSync(resolve(repositoryRoot, "frontend/.env.production"))).toBe(true);
    expect(read("frontend/.env.production")).toMatch(/^VITE_PID_ADAPTER=remote\s*$/m);
  });

  it("documenta a seleção no exemplo de ambiente", () => {
    expect(read(".env.example")).toMatch(/^VITE_PID_ADAPTER=local\s*$/m);
  });

  it("injeta e valida o adaptador antes do build Docker", () => {
    const dockerfile = read("deploy/Dockerfile.frontend");
    expect(dockerfile).toMatch(/ARG VITE_PID_ADAPTER(?:=local)?/);
    expect(dockerfile).toContain("ENV VITE_PID_ADAPTER=${VITE_PID_ADAPTER}");
    expect(dockerfile.indexOf("ARG VITE_PID_ADAPTER")).toBeLessThan(dockerfile.indexOf("RUN npm run build"));
    expect(dockerfile).toContain('test "$VITE_PID_ADAPTER" = "disabled"');
  });

  it("desabilita o adaptador local explicitamente no build do compose", () => {
    const compose = read("deploy/docker-compose.yaml");
    expect(compose).toMatch(/tcc-frontend:[\s\S]*args:\s*\n\s*VITE_PID_ADAPTER: disabled/);
  });

  it("fornece local explicitamente nos builds locais e de CI", () => {
    expect(read("frontend/scripts/build-local.mjs")).toContain('VITE_PID_ADAPTER: "local"');
    expect(read("frontend/package.json")).toContain('"build:local": "node scripts/build-local.mjs"');
    expect(read("desktop/package.json")).toContain("npm --prefix ../frontend run build:local");
    expect(read(".github/workflows/ci.yml")).toContain("npm run build:local");
    expect(read(".github/workflows/desktop-publish.yml")).toContain("npm run build:local");
    for (const workflow of [".github/workflows/ci.yml", ".github/workflows/docker-publish.yml"]) {
      expect(read(workflow)).toMatch(/file: deploy\/Dockerfile\.frontend[\s\S]*build-args:\s*\|\s*\n\s*VITE_PID_ADAPTER=disabled/);
    }
  });

  it("mantém validação de build sem fallback para valor ausente ou não suportado", () => {
    const viteConfig = read("frontend/vite.config.ts");
    expect(viteConfig).toContain("loadEnv");
    expect(viteConfig).toContain('["local", "disabled"]');
    expect(viteConfig).toContain("Adaptador P&ID não configurado");
  });

  it("documenta build local explícito e produção fail-closed", () => {
    const readme = read("README.md");
    expect(readme).toContain("npm run build:local");
    expect(readme).toContain("VITE_PID_ADAPTER=local npm run build");
    expect(readme).toContain("VITE_PID_ADAPTER=disabled npm run build");
    expect(readme).toContain("Adaptador P&ID não configurado");
    expect(readme).not.toMatch(/```bash\s*\ncd frontend\s*\nnpm run build\s*\n```/);
  });
});
