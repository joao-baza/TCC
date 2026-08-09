import { expect, test, type Page } from "@playwright/test";

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
});

test("abre o link de visualização sem expor escrita ou persistir mutações", async ({ page }) => {
  const { viewUrl } = await createDiagram(page, "Somente leitura");
  await insertPump(page);
  await expectSaveState(page, "Sincronizado");
  const before = await persistedPidRecord(page);

  await page.goto(viewUrl);
  await expect(page.getByText("Acesso de visualização", { exact: true })).toBeAttached();
  await expect(equipmentNodes(page)).toHaveCount(1);
  await expect(page.getByRole("region", { name: "Catálogo de símbolos", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Desfazer" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Excluir seleção" })).toHaveCount(0);

  await equipmentNodes(page).first().click();
  await page.keyboard.press("Delete");
  await page.waitForTimeout(500);
  await expect(equipmentNodes(page)).toHaveCount(1);
  expect(await persistedPidRecord(page)).toBe(before);
});

test("mantém o canvas utilizável em 375, 768, 1024 e 1440 px", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await createDiagram(page, "Responsivo");
  await insertPump(page);
  await expectSaveState(page, "Sincronizado");

  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    const canvas = page.getByRole("region", { name: "Canvas P&ID" });
    await expect(canvas).toBeVisible();
    const bounds = await canvas.boundingBox();
    expect(bounds, `canvas ausente em ${width}px`).not.toBeNull();
    expect(bounds!.x, `canvas fora da tela em ${width}px`).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width, `canvas excede a tela em ${width}px`).toBeLessThanOrEqual(width + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    if (width < 768) {
      await expect(page.getByText("Edição disponível em telas a partir de 768 px")).toBeVisible();
      await expect(page.getByRole("region", { name: "Catálogo de símbolos", exact: true })).toHaveCount(0);
    } else {
      await expect(page.getByRole("region", { name: "Catálogo de símbolos", exact: true })).toBeVisible();
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

  const suction = page.getByRole("button", { name: "Criar conexão pela porta de entrada suction" });
  await suction.focus();
  await suction.press("Enter");
  await suction.press("Enter");
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

async function createDiagram(page: Page, title: string): Promise<DiagramAccess> {
  await page.goto("/pid");
  await page.getByLabel("Título do diagrama").fill(title);
  await page.getByLabel("Norma").selectOption("free");
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
  await page.getByRole("treeitem", { name: /^Inserir Bomba centrífuga/ }).click();
  await expect(equipmentNodes(page)).toHaveCount(1);
}

function equipmentNodes(page: Page) {
  return page.locator(".react-flow__node").filter({ hasText: "Bomba centrífuga" });
}

async function expectSaveState(page: Page, state: string): Promise<void> {
  await expect(page.locator('footer[aria-label="Status do documento"]')).toContainText(state);
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
