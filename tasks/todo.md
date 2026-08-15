# TODO: SVGs de Fittings de Tubulacao

## Task 1: Normalize the visual template

**Description:** Establish the base SVG conventions from `frontend/public/pid/fitting-symbols/piping.svg`.

**Acceptance criteria:**
- [x] Standard stroke, color, pipe thickness, and `viewBox` conventions are written down.
- [x] The base tube SVG is kept unchanged as the visual reference.
- [x] Future SVGs can reuse the same hachura/pattern style.

**Verification:**
- [x] Manual check: open the base SVG and confirm it renders.

**Dependencies:** None

**Files likely touched:**
- `frontend/public/pid/fitting-symbols/piping.svg`
- `tasks/plan.md`

**Estimated scope:** XS

## Task 2: Define naming and geometry conventions

**Description:** Define canonical filenames and future connection-point expectations for the fitting SVGs.

**Acceptance criteria:**
- [x] Each backend fitting maps to one kebab-case filename.
- [x] Each fitting family has planned visual endpoints: 1, 2, or 3 connection points.
- [x] Names avoid accents in filenames but preserve Portuguese names in SVG titles.

**Verification:**
- [x] Manual check: every backend fitting has exactly one planned filename.

**Dependencies:** Task 1

**Files likely touched:**
- `tasks/plan.md`
- optional future metadata note in `frontend/public/pid/fitting-symbols/`

**Estimated scope:** S

## Task 3: Group fittings by reusable shape families

**Description:** Split the selected fittings into shape families so similar SVGs can be generated consistently.

**Acceptance criteria:**
- [x] Bends/curves are grouped together.
- [x] Tees/entries/exits are grouped together.
- [x] Valves are grouped together.
- [x] Fittings outside the selected set were identified and excluded during curadoria.

**Verification:**
- [x] Manual check: no fitting is missing from a group.

**Dependencies:** Task 2

**Files likely touched:**
- `tasks/plan.md`

**Estimated scope:** XS

## Task 4: Produce pipe and bend family SVGs

**Description:** Create approximate SVGs for retorno, cotovelos, and curvas using the base visual language.

**Acceptance criteria:**
- [x] SVGs exist for all selected bend/curve fittings.
- [x] Each SVG has visible open endpoints for future connection.
- [x] Each SVG includes a `<title>` and `<desc>`.

**Verification:**
- [x] Static check: all SVGs parse as XML.
- [x] Manual visual check: endpoints are recognizable.

**Dependencies:** Task 3

**Files likely touched:**
- `frontend/public/pid/fitting-symbols/*.svg`

**Estimated scope:** M

## Task 5: Produce tee, entry, exit, and return SVGs

**Description:** Create approximate SVGs for tees and pipe entry/exit fittings.

**Acceptance criteria:**
- [x] SVGs exist for `Te passagem reta`, `Entrada normal`, and `Saida de tanque`.
- [x] Tee-like SVGs expose three visual endpoints.
- [x] Entry/exit SVGs remain visually distinct from plain pipe.

**Verification:**
- [x] Static check: all SVGs parse as XML.
- [x] Manual visual check: branch direction is clear.

**Dependencies:** Task 3

**Files likely touched:**
- `frontend/public/pid/fitting-symbols/*.svg`

**Estimated scope:** M

## Task 6: Produce valve family SVGs

**Description:** Create approximate SVGs for valve fittings, reusing a small set of consistent valve glyphs.

**Acceptance criteria:**
- [x] SVGs exist for all selected valve fittings.
- [x] A valvula gaveta usa um unico simbolo generico.
- [x] Valve SVGs use two visual endpoints unless the fitting type clearly needs another shape.

**Verification:**
- [x] Static check: all SVGs parse as XML.
- [x] Manual visual check: valve variants remain identifiable by title/shape.

**Dependencies:** Task 3

**Files likely touched:**
- `frontend/public/pid/fitting-symbols/*.svg`

**Estimated scope:** M

## Task 7: Produce filter and specialty SVGs

**Description:** Review specialty fittings and keep only those included in the selected set.

**Acceptance criteria:**
- [x] Specialty candidates were reviewed during curadoria.
- [x] No excluded specialty fitting remains in the final set.
- [x] No fallback placeholder remains among the selected fittings.

**Verification:**
- [x] Static check: all SVGs parse as XML.
- [x] Manual visual check: specialty fittings are distinguishable.

**Dependencies:** Task 3

**Files likely touched:**
- `frontend/public/pid/fitting-symbols/*.svg`

**Estimated scope:** S

## Task 8: Run static validation over all SVGs

**Description:** Validate that the generated SVG files are well formed and stay within the expected asset conventions.

**Acceptance criteria:**
- [x] Every SVG parses as XML.
- [x] Every SVG has an `<svg>` root with `viewBox`.
- [x] Every SVG has a `<title>` and `<desc>`.
- [x] No external references or scripts are present.

**Verification:**
- [x] Run a focused SVG validation script or equivalent shell/XML check.

**Dependencies:** Tasks 4-7

**Files likely touched:**
- optional validation script or test file

**Estimated scope:** S

## Task 9: Create a visual contact sheet for review

**Description:** Generate an overview page/image so all fittings can be reviewed together.

**Acceptance criteria:**
- [x] All 15 selected SVGs appear in one review surface.
- [x] Each icon is labeled with its backend fitting name.
- [x] The base `piping.svg` appears as the style reference.

**Verification:**
- [x] Manual visual review of the contact sheet.

**Dependencies:** Task 8

**Files likely touched:**
- optional review artifact under `frontend/public/pid/fitting-symbols/`

**Estimated scope:** S

## Task 10: Prepare catalog metadata draft for future integration

**Description:** Draft the future P&ID catalog entries without wiring them into the live catalog yet.

**Acceptance criteria:**
- [x] Each selected fitting has a planned `key`, `assetUrl`, `defaultSize`, and `portTemplates`.
- [x] Port anchors are normalized between 0 and 1.
- [x] The draft is ready to be converted into validated catalog entries later.

**Verification:**
- [x] Manual check against current catalog validator constraints.

**Dependencies:** Task 9

**Files likely touched:**
- optional metadata draft under `frontend/public/pid/fitting-symbols/`

**Estimated scope:** M

## Task 11: Promote canonical fitting assets

**Description:** Copy the 15 reviewed SVGs to the canonical public symbol path.

**Acceptance criteria:**
- [x] Every selected asset exists under `frontend/public/pid/symbols/`.
- [x] Canonical filenames use the `project-fittings-` prefix.

## Task 12: Register fittings in the project catalog

**Description:** Add project-owned catalog entries without modifying generated Draw.io manifests.

**Acceptance criteria:**
- [x] The catalog publishes exactly 15 project fittings.
- [x] Names and aliases are searchable in Portuguese.
- [x] Ports use process connections and exact normalized visual anchors.

## Task 13: Validate editor integration

**Description:** Verify sanitization, insertion, geometry, build, and browser behavior.

**Acceptance criteria:**
- [x] All project SVGs pass the editor sanitizer.
- [x] The tee inserts with three process ports.
- [x] Catalog and geometry regression tests pass.

---

# TODO: Melhorias visuais canvas-first do editor P&ID

## Task 1: Introduzir estado de docks e composição canvas-first

**Description:** Extrair o estado de abertura do catálogo/inspetor e reorganizar o shell do editor para que o canvas seja dominante, mantendo rails persistentes e regras de breakpoint explícitas.

**Acceptance criteria:**
- [x] O editor inicia com canvas dominante e rails de catálogo/inspetor com alvo mínimo de 44px.
- [x] Abrir/fechar cada dock funciona por botão acessível e pelos atalhos `C`/`I`, sem alterar `PidDocument`.
- [x] Entre 768 e 1279px, abrir um dock fecha o outro sem perder scroll ou rascunho; a partir de 1280px, ambos podem coexistir.
- [x] O estado é lembrado por diagrama na sessão, sem aparecer no payload de autosave.

**Verification:**
- [x] `cd frontend && npm test -- --run src/test/pid/pid-editor-page-lifecycle.test.tsx src/test/pid/pid-dock-state.test.ts`
- [x] E2E: abrir/fechar os rails, alternar `C`/`I`, redimensionar em 768/1024/1280px e confirmar ausência de overflow horizontal.

**Dependencies:** None

**Files likely touched:**
- `frontend/src/features/pid/editor/pid-editor-page.tsx`
- `frontend/src/features/pid/editor/use-pid-dock-state.ts`
- `frontend/src/features/pid/editor/pid-dock-rail.tsx`
- `frontend/src/app/globals.css`
- `frontend/src/test/pid/pid-dock-state.test.ts`

**Estimated scope:** M

## Task 2: Reorganizar catálogo, inspetor e validação contextual

**Description:** Ajustar os conteúdos dos docks para priorizar descoberta no catálogo, resumo do elemento no inspetor e disclosure da validação baseado na quantidade real de problemas.

**Acceptance criteria:**
- [x] O catálogo mantém busca, filtros, virtualização, navegação por teclado e zoom de miniaturas, com a abertura claramente indicada.
- [x] O inspetor começa com resumo do elemento selecionado e prioriza propriedades sem remover o comportamento de rascunho/conflito.
- [x] A validação fica recolhida sem problemas e abre para erros bloqueantes, mantendo contadores e foco no elemento afetado.
- [x] Fechar/reabrir dock retorna foco ao opener e não descarta scroll, seleção ou rascunho válido.

**Verification:**
- [x] `cd frontend && npm test -- --run src/test/pid/catalog-panel.test.tsx src/test/pid/properties-inspector.test.tsx`
- [x] E2E/unitário: testar documento vazio, elemento selecionado, erro bloqueante, aviso e rascunho inválido.

**Dependencies:** Task 1

**Files likely touched:**
- `frontend/src/features/pid/catalog/catalog-panel.tsx`
- `frontend/src/features/pid/editor/properties-inspector.tsx`
- `frontend/src/features/pid/editor/validation-panel.tsx`
- `frontend/src/test/pid/catalog-panel.test.tsx`
- `frontend/src/test/pid/properties-inspector.test.tsx`

**Estimated scope:** M

## Task 3: Reposicionar estado de sessão, status e feedback

**Description:** Tornar título, modo, autosave/sincronização e ações de sessão escaneáveis no cabeçalho; reduzir o footer a métricas secundárias e manter erros recuperáveis próximos do contexto.

**Acceptance criteria:**
- [x] O cabeçalho exibe título, modo (`Editando`/`Somente leitura`) e estado de sincronização uma única vez.
- [x] O footer preserva zoom, posição, seleção/elementos e contagens compactas, sem duplicar o estado de salvamento.
- [x] Conflitos de autosave e falhas de operação continuam com `role="alert"`, ação de recuperação e anúncio acessível.
- [x] Share, export e ações destrutivas continuam separados e disponíveis conforme o escopo de acesso.

**Verification:**
- [x] `cd frontend && npm test -- --run src/test/pid/pid-status-bar.test.tsx src/test/pid/pid-editor-page-lifecycle.test.tsx`
- [x] `cd frontend && npm run build:local` (o build padrão permanece fail-closed sem `VITE_PID_ADAPTER`)
- [x] E2E: simular salvo, não salvo, salvando, conflito, erro de exportação e modo somente leitura.

**Dependencies:** Task 1

**Files likely touched:**
- `frontend/src/features/pid/editor/pid-editor-page.tsx`
- `frontend/src/features/pid/editor/pid-session-status.tsx`
- `frontend/src/features/pid/editor/status-bar.tsx`
- `frontend/src/test/pid/pid-status-bar.test.tsx`
- `frontend/src/test/pid/pid-editor-page-lifecycle.test.tsx`

**Estimated scope:** M

## Task 4: Aplicar tokens visuais e estados do canvas

**Description:** Consolidar tokens semânticos para chrome escuro/canvas claro e refinar seleção, grid, feedback ancorado, rails e transições sem quebrar o canvas React Flow.

**Acceptance criteria:**
- [x] Chrome permanece navy/petróleo, canvas permanece claro e todos os estados funcionais têm contraste suficiente.
- [x] Seleção e conexão usam combinação de cor, padrão de linha e legenda, nunca cor isolada.
- [x] Rails, docks, alertas e controles mantêm foco visível, alvos de 44px e reduced motion.
- [x] Transições usam apenas propriedades que não causam layout shift perceptível.

**Verification:**
- [x] `cd frontend && npm test -- --run src/test/pid/pid-canvas.test.tsx src/test/pid/pid-theme-provider.test.tsx`
- [x] E2E: validar foco por teclado, `prefers-reduced-motion`, canvas claro em chrome escuro e contraste de erro/aviso/sucesso.

**Dependencies:** Tasks 1-3

**Files likely touched:**
- `frontend/src/app/globals.css`
- `frontend/src/features/pid/canvas/pid-canvas.tsx`
- `frontend/src/features/pid/editor/pid-theme-provider.tsx`
- `frontend/src/test/pid/pid-canvas.test.tsx`
- `frontend/src/test/pid/pid-theme-provider.test.tsx`

**Estimated scope:** M

## Task 5: Cobrir responsividade, acessibilidade e fluxo completo

**Description:** Atualizar regressões unitárias/E2E para a nova composição e verificar que edição em 768px, leitura abaixo desse limite, exportação, autosave e ausência de overflow continuam funcionando.

**Acceptance criteria:**
- [x] Viewports de 375, 414, 768, 1024, 1280 e 1440px não criam scroll horizontal nem escondem controles.
- [x] O modo somente leitura abaixo de 768px mantém zoom, exportação, compartilhamento e mensagem clara de limite de edição.
- [x] Teclado, foco, labels, `aria-expanded`, `aria-pressed` e reduced motion são cobertos por testes E2E/unitários.
- [x] O fluxo criar → inserir → salvar → recarregar → visualizar → exportar permanece verde.

**Verification:**
- [x] `cd frontend && npm test -- --run src/test/pid/pid-editor-page.test.tsx src/test/pid/pid-readonly.test.tsx src/test/pid/pid-responsive-canvas.test.tsx`
- [x] `cd frontend && VITE_PID_ADAPTER=local npm run test:e2e -- tests/e2e/pid-editor.spec.ts`
- [x] `cd frontend && npm run build:local`
- [x] E2E: revisar as seis larguras em tema do editor, com teclado e reduced motion.

**Dependencies:** Tasks 1-4

**Files likely touched:**
- `frontend/src/test/pid/pid-editor-page.test.tsx`
- `frontend/src/test/pid/pid-readonly.test.tsx`
- `frontend/src/test/pid/pid-responsive-canvas.test.tsx`
- `frontend/tests/e2e/pid-editor.spec.ts`

**Estimated scope:** M

## Checkpoint: After Tasks 1-2

- [x] Shell canvas-first e docks contextuais passam nos testes focados.
- [x] Catálogo, inspetor e validação continuam operáveis por mouse e teclado.
- [x] Revisado e aprovado antes do polimento visual.

## Checkpoint: After Tasks 3-5

- [x] Header/footer e estados de erro estão consistentes.
- [x] Suíte focada, E2E do editor e build passam.
- [x] As seis larguras e reduced motion foram verificados.
- [x] Nenhum arquivo fora do escopo visual foi alterado além dos ajustes necessários aos testes E2E do contrato atual.
