import { expect, test } from "@playwright/test";

test("glossary page renders grouped entries and filters terms", async ({ page }) => {
  await page.goto("/glossary");

  await expect(page.getByRole("heading", { name: /Glossário/i })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: /Pesquisar no glossário/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Termos/i })).toBeVisible();
  await expect(page.getByText(/^Hidráulica$/i)).toBeVisible();
  await expect(page.getByText(/Número de Reynolds \(Re\)/i)).toBeVisible();

  await page.getByRole("searchbox", { name: /Pesquisar no glossário/i }).fill("brent");

  await expect(page.getByText(/Método de Brent/i)).toBeVisible();
  await expect(page.getByText(/Número de Reynolds \(Re\)/i)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /^Hidráulica$/i })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /^Reatores$/i })).toBeVisible();
});

test("glossary page matches accents and renders math content", async ({ page }) => {
  await page.goto("/glossary");

  await expect(page.getByRole("heading", { name: /Glossário/i })).toBeVisible();

  await page.getByRole("searchbox", { name: /Pesquisar no glossário/i }).fill("cavitacao");
  await expect(page.getByRole("heading", { name: /Cavitação/i })).toBeVisible();
  await expect(page.getByText(/Número de Reynolds \(Re\)/i)).toHaveCount(0);

  await page.getByRole("searchbox", { name: /Pesquisar no glossário/i }).fill("perda de carga distribuída");
  const article = page.getByText(/Perda de carga distribuída \(h_f\)/i).locator("..");
  await expect(article.locator(".katex").first()).toBeVisible();
});
