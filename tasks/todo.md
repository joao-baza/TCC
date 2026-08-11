# TODO: SVGs de Fittings de Tubulacao

## Task 1: Normalize the visual template

**Description:** Establish the base SVG conventions from `frontend/public/pid/fitting-symbols/tubulacao-modular.svg`.

**Acceptance criteria:**
- [x] Standard stroke, color, pipe thickness, and `viewBox` conventions are written down.
- [x] The base tube SVG is kept unchanged as the visual reference.
- [x] Future SVGs can reuse the same hachura/pattern style.

**Verification:**
- [x] Manual check: open the base SVG and confirm it renders.

**Dependencies:** None

**Files likely touched:**
- `frontend/public/pid/fitting-symbols/tubulacao-modular.svg`
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
- [x] The base `tubulacao-modular.svg` appears as the style reference.

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
