# Rollback Exploratory Legacy Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the legacy frontend in `frontend/` to the pre-exploratory HTML/CSS/vanilla-JS state while leaving the parallel Next.js work untouched.

**Architecture:** Revert only the exploratory visual layer introduced on 2026-07-03 by restoring the legacy frontend files from the parent of `eab2956`, then replace the exploratory-only regression tests with coverage that asserts the legacy state. The implementation stays isolated to the static frontend served by `deploy_app.sh` and does not change `frontend/src/**` or backend code.

**Tech Stack:** Git history restoration, static HTML, global CSS, vanilla JavaScript modules, pytest.

---

### Task 1: Replace exploratory-only test coverage with legacy-state coverage

**Files:**
- Delete: `demo/tests/test_exploratory_mode.py`
- Create: `demo/tests/test_legacy_frontend_state.py`

- [ ] **Step 1: Write the failing test**

Create `demo/tests/test_legacy_frontend_state.py` with:

```python
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def read(rel_path: str) -> str:
    return (ROOT / rel_path).read_text(encoding="utf-8")


def test_static_modules_do_not_have_exploratory_panels():
    html = read("frontend/index.html")

    forbidden_snippets = (
        'id="sizing-exploratory"',
        'id="flow-exploratory"',
        'id="pump-exploratory"',
        'id="sizing-exploratory-visuals"',
        'id="flow-exploratory-visuals"',
        'id="pump-exploratory-visuals"',
    )

    for snippet in forbidden_snippets:
        assert snippet not in html


def test_didatic_module_has_no_exploratory_hooks():
    didatic = read("frontend/js/modules/didatic.js")

    forbidden_snippets = (
        "pedagogicTemplates",
        "initExploratoryPanels",
        "_applyTemplate",
        "_buildSliders",
        "_renderGuidedSteps",
        "_setupScenarioButtons",
        "_overlayScenarios",
        "_injectDynamicPanels",
        "_scrollExploratoryPanelIntoView",
        "_renderExploratoryVisuals",
        "_buildExploratoryVisualShell",
        "Modo Exploratório",
        "Roteiro de exploração",
    )

    for snippet in forbidden_snippets:
        assert snippet not in didatic


def test_legacy_styles_do_not_define_exploratory_classes():
    styles = read("frontend/css/styles.css")

    forbidden_selectors = (
        ".exploratory-panel",
        ".sliders-section",
        ".guided-step",
        ".scenario-panel",
        ".exploratory-visuals",
        ".exploratory-visual-card",
        ".exploratory-placeholder",
    )

    for selector in forbidden_selectors:
        assert selector not in styles
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest demo/tests/test_legacy_frontend_state.py -q`
Expected: `FAIL` because the current legacy frontend still contains exploratory panel markup, hooks, and styles.

- [ ] **Step 3: Remove the exploratory-only test file**

Run:

```bash
rm demo/tests/test_exploratory_mode.py
```

- [ ] **Step 4: Run the new failing test again**

Run: `pytest demo/tests/test_legacy_frontend_state.py -q`
Expected: `FAIL` again for the same exploratory snippets; this confirms only the target behavior is still wrong.

- [ ] **Step 5: Commit**

```bash
git add demo/tests/test_legacy_frontend_state.py demo/tests/test_exploratory_mode.py
git commit -m "test: replace exploratory frontend coverage with legacy rollback checks"
```

### Task 2: Restore the legacy frontend files from the pre-exploratory snapshot

**Files:**
- Modify: `frontend/index.html`
- Modify: `frontend/css/styles.css`
- Modify: `frontend/js/modules/didatic.js`
- Modify: `frontend/js/modules/flow.js`
- Modify: `frontend/js/modules/pump.js`
- Modify: `frontend/js/modules/reactor.js`
- Modify: `frontend/js/modules/sizing.js`
- Modify: `frontend/js/modules/balance.js`

- [ ] **Step 1: Restore the first two static files from the parent of `eab2956`**

Run:

```bash
git restore --source a374d5b3b7fe125dff584a37b404d18181c52ab3 -- frontend/index.html frontend/css/styles.css
```

- [ ] **Step 2: Restore the didactic orchestrator from the same snapshot**

Run:

```bash
git restore --source a374d5b3b7fe125dff584a37b404d18181c52ab3 -- frontend/js/modules/didatic.js
```

- [ ] **Step 3: Restore the module files touched by the exploratory visuals**

Run:

```bash
git restore --source a374d5b3b7fe125dff584a37b404d18181c52ab3 -- frontend/js/modules/flow.js frontend/js/modules/pump.js frontend/js/modules/reactor.js frontend/js/modules/sizing.js frontend/js/modules/balance.js
```

- [ ] **Step 4: Inspect the diff to verify scope stayed inside the legacy frontend**

Run: `git diff -- frontend/index.html frontend/css/styles.css frontend/js/modules/didatic.js frontend/js/modules/flow.js frontend/js/modules/pump.js frontend/js/modules/reactor.js frontend/js/modules/sizing.js frontend/js/modules/balance.js`
Expected: only removals or reversions related to exploratory panels, visual shells, exploratory rerender hooks, and module render surfaces added for that mode.

- [ ] **Step 5: Commit**

```bash
git add frontend/index.html frontend/css/styles.css frontend/js/modules/didatic.js frontend/js/modules/flow.js frontend/js/modules/pump.js frontend/js/modules/reactor.js frontend/js/modules/sizing.js frontend/js/modules/balance.js
git commit -m "refactor(frontend): restore legacy frontend before exploratory mode"
```

### Task 3: Validate the restored legacy state

**Files:**
- Test: `demo/tests/test_legacy_frontend_state.py`

- [ ] **Step 1: Run the legacy rollback test**

Run: `pytest demo/tests/test_legacy_frontend_state.py -q`
Expected: `3 passed` after the exploratory snippets have been removed from the legacy frontend.

- [ ] **Step 2: Run a broader frontend-adjacent regression check**

Run: `pytest demo/tests -q`
Expected: `PASS` for the remaining demo/frontend checks, or a smaller failure set clearly unrelated to the rollback.

- [ ] **Step 3: Verify no Next.js files were changed**

Run: `git diff --name-only`
Expected: only `demo/tests/test_legacy_frontend_state.py`, removal of `demo/tests/test_exploratory_mode.py`, and the restored legacy frontend files. `frontend/src/**` and `frontend/next-env.d.ts` must not be touched by this rollback.

- [ ] **Step 4: Review the working tree before handoff**

Run: `git status --short`
Expected: only the rollback files remain modified; unrelated pre-existing changes such as `frontend/next-env.d.ts` stay untouched and unstaged unless explicitly requested.

- [ ] **Step 5: Commit**

```bash
git add demo/tests/test_legacy_frontend_state.py demo/tests/test_exploratory_mode.py frontend/index.html frontend/css/styles.css frontend/js/modules/didatic.js frontend/js/modules/flow.js frontend/js/modules/pump.js frontend/js/modules/reactor.js frontend/js/modules/sizing.js frontend/js/modules/balance.js
git commit -m "test: validate legacy frontend rollback state"
```
