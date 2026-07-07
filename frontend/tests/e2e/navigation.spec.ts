import { expect, test } from "@playwright/test";

import { moduleRoutes } from "@/lib/routes";

const sidebarRoutes = moduleRoutes.filter((route) => route.path !== "/");
const sidebarGroups = [...new Set(sidebarRoutes.map((route) => route.group))];

test("desktop sidebar mirrors the route map", async ({ page }) => {
  await page.goto("/");

  const navigation = page.getByRole("navigation", { name: /Navegação principal/i });

  for (const group of sidebarGroups) {
    await expect(navigation.getByText(group)).toBeVisible();
  }

  for (const route of moduleRoutes) {
    const link = navigation.getByRole("link", { name: route.label });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", route.path);
  }
});

test("mobile user can open the navigation drawer and reach the glossary", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("button", { name: /Abrir navegação/i })).toBeVisible();
  await page.getByRole("button", { name: /Abrir navegação/i }).click();

  const navigation = page.getByRole("navigation", { name: /Navegação principal/i });
  await expect(navigation).toBeVisible();

  for (const route of moduleRoutes) {
    const link = navigation.getByRole("link", { name: route.label });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", route.path);
  }

  await navigation.getByRole("link", { name: /^Glossário$/i }).click();

  await expect(page).toHaveURL(/\/glossary$/);
});
