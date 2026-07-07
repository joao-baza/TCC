import { expect, test } from "@playwright/test";

test("home page shows learning trails and quick access links", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /DCOU - Dimensionamento Computacional de Operações Unitárias/i,
    }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /Trilhas de Aprendizagem/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Acesso Rápido/i })).toBeVisible();
  await expect(page.getByText(/Transporte de Fluidos/i)).toBeVisible();
  await expect(page.locator('a[href="/exercises"]').first()).toBeVisible();
  await expect(page.locator('a[href="/glossary"]').first()).toBeVisible();

  await page.locator('a[href="/glossary"]').first().click();

  await expect(page).toHaveURL(/\/glossary$/);
});
