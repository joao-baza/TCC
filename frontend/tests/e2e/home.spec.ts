import { expect, test } from "@playwright/test";

test("renders the new IA home entry points", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: "Iniciar uma simulação" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Seguir uma trilha" })).toBeVisible();
  await expect(page.getByText("Recursos de Apoio")).toBeVisible();
  await expect(page.getByText("Para Docência")).toBeVisible();
});

test("starts from home and reaches a simulation through the new primary CTA", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Iniciar uma simulação" }).click();
  await expect(page.getByRole("heading", { name: "Simulações em Destaque" })).toBeVisible();
  await page.getByRole("button", { name: "Abrir módulo de Escoamento" }).click();
  await expect(page.getByRole("heading", { name: "Cálculos de Escoamento" })).toBeVisible();
});
