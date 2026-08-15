import { readFile } from "node:fs/promises";

import { expect, test, type Locator, type Page } from "@playwright/test";

interface DiagramAccess {
  readonly editUrl: string;
  readonly viewUrl: string;
}

test("cria, desenha, recarrega e exporta o documento canônico", async ({ page }) => {
  await createDiagram(page, "Área 100");
  await insertPump(page);
  await expectSaveState(page, "Sincronizado");

  await page.reload();
  await expect(page.getByRole("heading", { name: "Área 100" })).toBeVisible();
  await expect(equipmentNodes(page)).toHaveCount(1);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar SVG" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("area-100.svg");
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const svg = await readFile(downloadPath!, "utf8");
  expect(svg).toContain('aria-label="Área 100"');
  expect(svg).toContain("Bomba Centrífuga");
  expect(svg).toContain("data-element-id=");
  expect(svg).not.toMatch(/minimap|selection|cursor|validation/i);
});

test("abre o link de visualização sem expor escrita ou persistir mutações", async ({ page }) => {
  const { viewUrl } = await createDiagram(page, "Somente leitura");
  await insertPump(page);
  await expectSaveState(page, "Sincronizado");
  const before = await persistedPidRecord(page);
  const diagramId = new URL(viewUrl).pathname.split("/").at(-1)!;
  await page.addInitScript(({ recordKey }) => {
    const runtime = window as Window & { __pidStorageWrites?: string[] };
    runtime.__pidStorageWrites = [];
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(key: string, value: string) {
      if (key === recordKey) runtime.__pidStorageWrites!.push(value);
      return original.call(this, key, value);
    };
  }, { recordKey: `dcou.pid.local.v1.${diagramId}` });
  await page.clock.install();

  await page.goto(viewUrl);
  await expect(page.getByText("Acesso de visualização", { exact: true })).toBeAttached();
  await expect(equipmentNodes(page)).toHaveCount(1);
  await expect(page.getByRole("region", { name: "Catálogo de símbolos", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Desfazer" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Excluir seleção" })).toHaveCount(0);

  await equipmentNodes(page).first().click();
  await page.keyboard.press("Delete");
  await expectSaveState(page, "Sincronizado");
  await page.clock.runFor(400);
  await expect(equipmentNodes(page)).toHaveCount(1);
  expect(await page.evaluate(() => (
    window as Window & { __pidStorageWrites?: string[] }
  ).__pidStorageWrites ?? [])).toEqual([]);
  expect(await persistedPidRecord(page)).toBe(before);
});

test("mantém a criação acessível em todos os viewports e temas", async ({ page }) => {
  test.setTimeout(60_000);
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    for (const width of [375, 414, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/pid");
      await expect(page.getByRole("heading", { name: "Editor P&ID" })).toBeVisible();
      await page.evaluate((selectedTheme) => {
        document.documentElement.classList.toggle("dark", selectedTheme === "dark");
      }, theme);

      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width === 375 || width === 1024) {
        await expectMinimumTargetSize(page);
        await expectKeyboardFocusVisible(page);
      }
    }
  }
});

test("mantém o canvas utilizável em 375, 414, 768, 1024, 1280 e 1440 px", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await createDiagram(page, "Responsivo");
  await insertPump(page);
  await expectSaveState(page, "Sincronizado");

  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: theme === "dark" ? "reduce" : "no-preference" });
    await page.evaluate((selectedTheme) => {
      document.documentElement.classList.toggle("dark", selectedTheme === "dark");
    }, theme);
    for (const width of [375, 414, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 800 });
      const canvas = page.getByRole("region", { name: "Canvas P&ID" });
      await expect(canvas).toBeVisible();
      const bounds = await canvas.boundingBox();
      expect(bounds, `canvas ausente em ${width}px`).not.toBeNull();
      expect(bounds!.x, `canvas fora da tela em ${width}px`).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width, `canvas excede a tela em ${width}px`).toBeLessThanOrEqual(width + 1);
      expect(await canvas.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgb(248, 250, 252)");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expectMinimumTargetSize(page);
      await expectPanelsOutsideCanvas(page, canvas);

      if (width < 768) {
        await expect(page.getByText("Edição disponível em telas a partir de 768 px")).toBeVisible();
        await expect(page.getByRole("region", { name: "Catálogo de símbolos", exact: true })).toHaveCount(0);
      } else {
        await expect(page.getByRole("region", { name: "Catálogo de símbolos", exact: true })).toBeVisible();
      }
      if (width === 768 || width === 1280 || width === 1440) await expectToolbarContentContained(page);
      if (width === 1024) await expectKeyboardFocusVisible(page);
    }
  }
});

test("preserva canvas claro no tema escuro e reduz movimento", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await createDiagram(page, "Tema e movimento");
  await page.evaluate(() => document.documentElement.classList.add("dark"));

  const evidence = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLElement>(".pid-studio-canvas")!;
    const workspace = document.querySelector<HTMLElement>(".pid-studio-workspace")!;
    return {
      dark: document.documentElement.classList.contains("dark"),
      reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
      canvasBackground: getComputedStyle(canvas).backgroundColor,
      workspaceTransition: getComputedStyle(workspace).transitionDuration,
    };
  });

  expect(evidence.dark).toBe(true);
  expect(evidence.reduced).toBe(true);
  expect(evidence.canvasBackground).toBe("rgb(248, 250, 252)");
  expect(Number.parseFloat(evidence.workspaceTransition)).toBeLessThanOrEqual(0.001);
});

test("expõe falha de autosave e permite tentar novamente", async ({ page }) => {
  await createDiagram(page, "Retry de salvamento");
  await failNextPidWrite(page);
  await insertPump(page);

  await expect(page.getByRole("button", { name: "Tentar salvar novamente" })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: /armazenamento local/i })).toBeVisible();
  await page.getByRole("button", { name: "Tentar salvar novamente" }).click();
  await expectSaveState(page, "Sincronizado");

  await page.reload();
  await expect(equipmentNodes(page)).toHaveCount(1);
});

test("rejeita conexão inválida sem criar linha", async ({ page }) => {
  await createDiagram(page, "Conexão inválida");
  await insertPump(page);

  const port = page.getByRole("button", { name: /^Criar conexão pela porta de / }).first();
  await port.focus();
  await port.press("Enter");
  await port.press("Enter");
  await expect(page.getByText(/Conexão inválida:/)).toBeAttached();
  await expect(page.locator(".react-flow__edge")).toHaveCount(0);
});

test("copia, cola e desfaz uma seleção pelo teclado", async ({ page }) => {
  await createDiagram(page, "Clipboard e undo");
  await insertPump(page);
  await equipmentNodes(page).first().click();

  await page.keyboard.press("ControlOrMeta+c");
  await page.keyboard.press("ControlOrMeta+v");
  await expect(equipmentNodes(page)).toHaveCount(2);
  await page.keyboard.press("ControlOrMeta+z");
  await expect(equipmentNodes(page)).toHaveCount(1);
});

test("falha de PNG mantém a exportação SVG disponível", async ({ page }) => {
  await createDiagram(page, "Fallback PNG");
  await insertPump(page);
  await expectSaveState(page, "Sincronizado");
  await page.evaluate(() => {
    HTMLCanvasElement.prototype.toBlob = function toBlob(callback: BlobCallback) {
      callback(null);
    };
  });

  await page.getByRole("button", { name: "Exportar PNG" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Não foi possível gerar PNG" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Exportar SVG" })).toBeEnabled();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar SVG" }).click();
  expect((await downloadPromise).suggestedFilename()).toBe("fallback-png.svg");
});

test("toolbar usa botões com ícones e dropdowns", async ({ page }) => {
  await createDiagram(page, "Toolbar UX");
  const toolbar = page.getByRole("toolbar", { name: "Ferramentas do editor P&ID" });
  await expect(toolbar.getByRole("button", { name: "Desfazer" })).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Refazer" })).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Exportar SVG" })).toBeVisible();
  await expect(toolbar.getByRole("combobox", { name: "Tipo de linha de conexão" })).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Linha de processo" })).toHaveCount(0);
});

test("abre diálogo de configurações e persiste após reload", async ({ page }) => {
  await createDiagram(page, "Configurações");
  await page.getByRole("button", { name: "Configurações" }).click();
  await expect(page.getByRole("dialog", { name: "Configurações do editor P&ID" })).toBeVisible();
  const largeButton = page.getByRole("dialog").getByRole("button", { name: "Grande" }).first();
  await largeButton.click();
  await expect(largeButton).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("dialog").getByRole("button", { name: "Fechar" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Configurações" }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Grande" }).first()).toHaveAttribute("aria-pressed", "true");
});

test("slider de zoom do catálogo redimensiona miniaturas", async ({ page }) => {
  await createDiagram(page, "Zoom catálogo");
  await page.getByRole("button", { name: "Abrir catálogo" }).click();
  await page.getByRole("slider", { name: "Tamanho das miniaturas" }).fill("64");
  const img = page.locator("[role='tree'] img").first();
  await expect(img).toBeVisible();
  const height = await img.evaluate((el) => (el as HTMLImageElement).height);
  expect(height).toBe(64);
});

test("barra de status mostra contagem de validação dinâmica", async ({ page }) => {
  await createDiagram(page, "Validação");
  const footer = page.locator('footer[aria-label="Status do documento"]');
  await expect(footer).toContainText("Avisos 0");
  await expect(footer).toContainText("Erros 0");
});

test("abre e fecha os docks sem retirar o canvas do fluxo", async ({ page }) => {
  await createDiagram(page, "Docks contextuais");

  await expect(page.getByRole("region", { name: "Catálogo de símbolos", exact: true })).toHaveAttribute("data-dock-state", "closed");
  await expect(page.getByRole("region", { name: "Inspetor", exact: true })).toHaveAttribute("data-dock-state", "open");

  await page.getByRole("button", { name: "Abrir catálogo" }).click();
  await expect(page.getByRole("tree", { name: "Símbolos disponíveis" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Catálogo de símbolos", exact: true })).toHaveAttribute("data-dock-state", "open");
  await page.getByRole("button", { name: "Fechar catálogo" }).click();
  await expect(page.getByRole("tree", { name: "Símbolos disponíveis" })).toHaveCount(0);

  await page.getByRole("button", { name: "Fechar inspetor" }).click();
  await expect(page.getByRole("region", { name: "Inspetor", exact: true })).toHaveAttribute("data-dock-state", "closed");
  await expect(page.getByRole("region", { name: "Canvas P&ID" })).toBeVisible();

  await page.keyboard.press("c");
  await page.keyboard.press("i");
  await expect(page.getByRole("region", { name: "Catálogo de símbolos", exact: true })).toHaveAttribute("data-dock-state", "open");
  await expect(page.getByRole("region", { name: "Inspetor", exact: true })).toHaveAttribute("data-dock-state", "open");
});

async function createDiagram(page: Page, title: string): Promise<DiagramAccess> {
  await page.goto("/pid");
  await page.getByLabel("Título do diagrama").fill(title);
  await page.getByLabel("Seu nome").fill("Ana");
  await page.getByRole("button", { name: "Criar diagrama" }).click();
  const viewUrl = await page.getByRole("textbox", { name: "Link de visualização" }).inputValue();
  const editUrl = await page.getByRole("textbox", { name: "Link de edição" }).inputValue();
  await page.getByLabel("Copiei o link de edição").check();
  await page.getByRole("link", { name: "Abrir editor" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  return { editUrl, viewUrl };
}

async function insertPump(page: Page): Promise<void> {
  const catalog = page.getByRole("treeitem", { name: /^Bomba Centrífuga/ });
  if (await catalog.count() === 0) await page.getByRole("button", { name: "Abrir catálogo" }).click();
  if (await catalog.count() === 0) await page.getByLabel("Pesquisar símbolos").fill("Bomba Centrífuga");
  await catalog.first().click();
  await expect(equipmentNodes(page)).toHaveCount(1);
}

function equipmentNodes(page: Page) {
  return page.locator(".react-flow__node").filter({ hasText: /Bomba Centrífuga/i });
}

async function expectSaveState(page: Page, state: string): Promise<void> {
  await expect(page.getByRole("group", { name: "Estado da sessão" })).toContainText(state);
}

async function persistedPidRecord(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    const key = Object.keys(localStorage).find((candidate) => (
      candidate.startsWith("dcou.pid.local.v1.")
      && !candidate.endsWith("cleanup-cursor")
      && !candidate.endsWith("cleanup-lock")
    ));
    return key ? localStorage.getItem(key) : null;
  });
}

async function failNextPidWrite(page: Page): Promise<void> {
  await page.evaluate(() => {
    const storagePrototype = Storage.prototype as Storage & { __pidOriginalSetItem?: Storage["setItem"] };
    const original = storagePrototype.__pidOriginalSetItem ?? Storage.prototype.setItem;
    storagePrototype.__pidOriginalSetItem = original;
    let shouldFail = true;
    Storage.prototype.setItem = function setItem(key: string, value: string) {
      if (shouldFail && key.startsWith("dcou.pid.local.v1.") && !key.endsWith("cleanup-cursor")) {
        shouldFail = false;
        throw new DOMException("Quota simulada", "QuotaExceededError");
      }
      return original.call(this, key, value);
    };
  });
}

async function expectMinimumTargetSize(page: Page): Promise<void> {
  const targets = await page.evaluate(() => {
    const root = document.querySelector("main") ?? document.querySelector('[role="tabpanel"]') ?? document.body;
    return Array.from(root.querySelectorAll<HTMLElement>('button, a, input:not([type="checkbox"]), select, textarea, [role="button"], [role="treeitem"]'))
      .filter((target) => {
        if (target.getAttribute("aria-label")?.startsWith("Criar conexão pela porta")) return false;
        const style = window.getComputedStyle(target);
        const rect = target.getBoundingClientRect();
        return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
      })
      .map((target, index) => {
        const rect = target.getBoundingClientRect();
        return {
          index,
          label: (target.getAttribute("aria-label") ?? target.textContent ?? `alvo ${index}`).trim(),
          width: rect.width,
          height: rect.height,
        };
      });
  });
  for (const target of targets) {
    expect(target.width, `${target.label} deve ter largura mínima de 44 px`).toBeGreaterThanOrEqual(44);
    expect(target.height, `${target.label} deve ter altura mínima de 44 px`).toBeGreaterThanOrEqual(44);
  }
}

async function expectPanelsOutsideCanvas(page: Page, canvas: Locator): Promise<void> {
  const canvasBox = await canvas.boundingBox();
  expect(canvasBox).not.toBeNull();
  for (const panelName of ["Catálogo de símbolos", "Inspetor"]) {
    const panel = page.getByRole("region", { name: panelName, exact: true });
    if (await panel.count() === 0 || !(await panel.isVisible())) continue;
    const panelBox = await panel.boundingBox();
    expect(panelBox).not.toBeNull();
    const overlapWidth = Math.min(canvasBox!.x + canvasBox!.width, panelBox!.x + panelBox!.width)
      - Math.max(canvasBox!.x, panelBox!.x);
    const overlapHeight = Math.min(canvasBox!.y + canvasBox!.height, panelBox!.y + panelBox!.height)
      - Math.max(canvasBox!.y, panelBox!.y);
    expect(
      overlapWidth <= 0 || overlapHeight <= 0,
      `${panelName} não deve sobrepor geometricamente o canvas`,
    ).toBe(true);
  }
}

async function expectToolbarContentContained(page: Page): Promise<void> {
  const toolbar = page.getByRole("toolbar", { name: "Ferramentas do editor P&ID" });
  const targets = toolbar.locator("button, select, label, [role=group]");
  for (let index = 0; index < await targets.count(); index += 1) {
    const target = targets.nth(index);
    if (!(await target.isVisible())) continue;
    const geometry = await target.evaluate((element) => ({
      label: element.getAttribute("aria-label") ?? element.textContent?.trim() ?? element.tagName,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(
      geometry.scrollWidth,
      `${geometry.label} deve conter o próprio texto sem corte`,
    ).toBeLessThanOrEqual(geometry.clientWidth + 1);
  }

  for (const container of [toolbar, ...await toolbar.locator(":scope > [role=group]").all()]) {
    const children = container.locator(":scope > button, :scope > label, :scope > [role=group]");
    const rectangles = [];
    for (let index = 0; index < await children.count(); index += 1) {
      const child = children.nth(index);
      if (!(await child.isVisible())) continue;
      const box = await child.boundingBox();
      if (box) rectangles.push({ box, label: await child.getAttribute("aria-label") ?? await child.textContent() ?? `${index}` });
    }
    for (let index = 1; index < rectangles.length; index += 1) {
      const previous = rectangles[index - 1];
      const current = rectangles[index];
      expect(
        previous.box.x + previous.box.width,
        `${previous.label.trim()} não deve sobrepor ${current.label.trim()}`,
      ).toBeLessThanOrEqual(current.box.x + 0.5);
    }
  }
}

async function expectKeyboardFocusVisible(page: Page): Promise<void> {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null;
    if (!active || active === document.body) return null;
    const style = getComputedStyle(active);
    return {
      tag: active.tagName,
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
      boxShadow: style.boxShadow,
    };
  });
  expect(focus, "Tab deve alcançar um controle").not.toBeNull();
  expect(
    focus!.outlineStyle !== "none" && focus!.outlineWidth > 0 || focus!.boxShadow !== "none",
    `${focus!.tag} deve expor foco visível`,
  ).toBe(true);
}
