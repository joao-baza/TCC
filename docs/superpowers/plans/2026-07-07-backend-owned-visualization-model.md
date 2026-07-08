# Backend-Owned Visualization Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every calculation used by the frontend for results, curves, ticks, markers, and didactic approximations into backend-owned endpoints while keeping the current UI almost unchanged.

**Architecture:** Introduce a shared backend `ChartModel` plus reusable sampling/tick helpers, then expose explicit visualization endpoints from the existing domain routers. The frontend becomes a renderer of backend-provided chart data instead of a calculator, with the migration done in phases so each module remains testable and shippable on its own.

**Tech Stack:** FastAPI, Pydantic, NumPy, Pint, CoolProp, React, TypeScript, SVG, Pytest, Vitest.

---

## File Map

- Create `models/charting.py` for shared backend chart helpers and model-building functions.
- Modify `schemas.py` to add shared chart response schemas and module-specific chart payload wrappers.
- Modify `routers/flow.py`, `routers/pump.py`, `routers/reactor.py`, `routers/components_router.py`, and `routers/mass_balance.py` to expose dedicated chart endpoints.
- Modify `models/reactor.py` and `models/mass_balance.py` where chart generation is currently tied to Matplotlib or local sampling.
- Create `frontend/src/types/chart-model.ts` for the TypeScript mirror of the backend chart contract.
- Create `frontend/src/components/viz/chart-model-renderer.tsx` as the generic SVG renderer for backend chart models.
- Modify `frontend/src/components/viz/chart-axis-utils.ts` and `frontend/src/components/viz/chart-grid.tsx` so they render precomputed axis metadata instead of inventing chart math locally.
- Modify chart-heavy frontend components under `frontend/src/components/viz/`.
- Modify page entrypoints under `frontend/src/features/flow/`, `frontend/src/features/pump/`, `frontend/src/features/reactor/`, `frontend/src/features/components/`, `frontend/src/features/balance/`, and `frontend/src/features/exercises/`.
- Add backend coverage in `demo/tests/`.
- Add frontend coverage in `frontend/src/test/`.

---

### Task 1: Build the backend chart contract and shared helpers

**Files:**
- Create: `models/charting.py`
- Modify: `schemas.py`
- Create: `demo/tests/test_charting_models.py`

- [ ] **Step 1: Write the failing backend contract tests**

```python
from models.charting import build_linear_axis, build_log_axis, build_series_model


def test_linear_axis_expands_flat_domain():
    axis = build_linear_axis([12.0, 12.0], label="Vazão", units="m³/s")
    assert axis.domain["min"] < 12.0
    assert axis.domain["max"] > 12.0
    assert axis.ticks[0] == axis.domain["min"]


def test_log_axis_builds_major_ticks():
    axis = build_log_axis([1_000.0, 10_000_000.0], label="Re", units="adimensional")
    assert axis.scale == "log"
    assert 1_000 in axis.ticks
    assert 10_000_000 in axis.ticks


def test_series_model_serializes_points():
    series = build_series_model("curve", [{"x": 0.0, "y": 1.0}], color="#0f766e")
    assert series.kind == "line"
    assert series.points[0]["x"] == 0.0
```

- [ ] **Step 2: Run the backend tests and confirm they fail**

Run:

```bash
cd /home/jpbgr/Área de trabalho/Projetos/Pessoais/TCC
.venv/bin/pytest -q demo/tests/test_charting_models.py demo/tests/test_schemas.py
```

Expected: failure because the chart model types and helpers do not exist yet.

- [ ] **Step 3: Implement the shared chart schema and helper layer**

```python
class AxisModel(BaseModel):
    scale: Literal["linear", "log"]
    label: str
    units: str | None = None
    domain: dict[str, float]
    ticks: list[float]


class SeriesModel(BaseModel):
    id: str
    kind: Literal["line", "scatter", "area", "band"]
    points: list[dict[str, float]]
    color: str | None = None


class MarkerModel(BaseModel):
    id: str
    x: float
    y: float
    label: str


class ChartModel(BaseModel):
    id: str
    title: str
    subtitle: str | None = None
    approximation_notice: str | None = None
    axes: dict[str, AxisModel]
    series: list[SeriesModel]
    markers: list[MarkerModel] = []
    annotations: list[dict[str, str]] = []
    metadata: dict[str, str] = {}
```

Implement in `models/charting.py`:

```python
def build_linear_axis(values: list[float], *, label: str, units: str | None = None, tick_count: int = 5) -> AxisModel
def build_log_axis(values: list[float], *, label: str, units: str | None = None) -> AxisModel
def build_series_model(
    series_id: str,
    points: list[dict[str, float]],
    *,
    color: str | None = None,
    kind: str = "line",
) -> SeriesModel
def build_chart_model(
    *,
    chart_id: str,
    title: str,
    axes: dict[str, AxisModel],
    series: list[SeriesModel],
    markers: list[MarkerModel] | None = None,
    annotations: list[dict[str, str]] | None = None,
    subtitle: str | None = None,
    approximation_notice: str | None = None,
    metadata: dict[str, str] | None = None,
) -> ChartModel
```

Keep the helper layer pure. It should only calculate axes, sample points, series ordering, labels, and metadata.

- [ ] **Step 4: Run the backend tests again**

Run:

```bash
.venv/bin/pytest -q demo/tests/test_charting_models.py demo/tests/test_schemas.py
```

Expected: pass.

- [ ] **Step 5: Commit the foundation**

```bash
git add -f models/charting.py schemas.py demo/tests/test_charting_models.py
git commit -m "feat: add backend chart model foundation"
```

---

### Task 2: Move flow and pump chart math into backend endpoints

**Files:**
- Modify: `routers/flow.py`
- Modify: `routers/pump.py`
- Modify: `models/hydraulic.py`
- Modify: `models/charting.py`
- Modify: `schemas.py`
- Modify: `demo/tests/test_flow_router.py`
- Modify: `demo/tests/test_pump_router.py`
- Modify: `demo/tests/test_hydraulic.py`

- [ ] **Step 1: Write failing endpoint tests for chart payloads**

```python
def test_flow_moody_chart_endpoint_returns_axes_series_and_markers(client):
    response = client.post(
        "/flow/moody/chart",
        json={"reynolds": 50000, "friction_factor": 0.0215, "roughness": 0.045},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["axes"]["x"]["scale"] == "log"
    assert payload["series"]
    assert payload["markers"]


def test_pump_headloss_chart_endpoint_returns_curve_model(client):
    response = client.post(
        "/pump/headloss/chart",
        json={
            "method": "Darcy-Weisbach",
            "pipe_length": 100,
            "diameter": 125,
            "flow_rate": 0.04,
            "velocity": 3.259493234522017,
            "friction_factor": 0.04495094389484752,
            "friction_method": "SwameeJain",
            "composition": "Aço galvanizado",
            "fittings": [
                {"fitting": "Cotovelo 45°", "quantity": 5},
                {"fitting": "Saída de tanque", "quantity": 1},
            ],
        },
    )
    assert response.status_code == 200
    assert response.json()["title"] == "Curva da bomba e do sistema"
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run:

```bash
.venv/bin/pytest -q demo/tests/test_flow_router.py demo/tests/test_pump_router.py demo/tests/test_hydraulic.py
```

Expected: fail because the new chart endpoints and chart payload models are not implemented yet.

- [ ] **Step 3: Implement the backend flow and pump visualization endpoints**

Add explicit chart endpoints to the existing routers:

- `POST /flow/moody/chart` should accept the same Reynolds/factor/roughness inputs currently used to render `MoodyChart`.
- `POST /pump/headloss/chart` should reuse `HeadLossRequest` and return both the pump curve and the system curve model.
- `POST /pump/head/chart` should reuse `HeadRequest` and return the pressure/elevation/velocity breakdown as markers or stacked series.

Use `models/charting.py` for:

- logarithmic Reynolds axis generation
- friction-factor curve sampling
- system curve construction
- operational marker placement
- label and unit formatting

Keep the existing numeric endpoints intact so the UI can migrate without losing behavior.

- [ ] **Step 4: Run the targeted backend tests**

Run:

```bash
.venv/bin/pytest -q demo/tests/test_flow_router.py demo/tests/test_pump_router.py demo/tests/test_hydraulic.py
```

Expected: pass.

- [ ] **Step 5: Commit the flow/pump backend work**

```bash
git add -f routers/flow.py routers/pump.py models/hydraulic.py models/charting.py schemas.py demo/tests/test_flow_router.py demo/tests/test_pump_router.py demo/tests/test_hydraulic.py
git commit -m "feat: move flow and pump chart math to backend"
```

---

### Task 3: Move reactor, components, and mass-balance visual math into backend endpoints

**Files:**
- Modify: `routers/reactor.py`
- Modify: `models/reactor.py`
- Modify: `routers/components_router.py`
- Modify: `routers/mass_balance.py`
- Modify: `models/mass_balance.py`
- Modify: `models/charting.py`
- Modify: `schemas.py`
- Modify: `demo/tests/test_reactor_router.py`
- Modify: `demo/tests/test_components_router.py`
- Modify: `demo/tests/test_mass_balance_router.py`

- [ ] **Step 1: Write failing tests for the new visualization endpoints**

```python
def test_reactor_levenspiel_chart_endpoint_returns_points(client):
    response = client.post(
        "/reactor/levenspiel/chart",
        json={
            "input_type": "conversion_and_kinetics",
            "components": [
                {
                    "state": "liquid",
                    "component_name": "A",
                    "flow_rate_inlet": 0.01,
                    "molar_concentration_inlet": 1000,
                },
                {
                    "state": "liquid",
                    "component_name": "B",
                    "flow_rate_inlet": 0.0,
                    "molar_concentration_inlet": 0.0,
                },
            ],
            "stoichiometric_coefficients": [-1, 1],
            "reaction_rate_params": {"k": 0.5, "reaction_orders": [1, 0]},
            "operation_conditions": {
                "initial_temperature": 298.15,
                "initial_pressure": 101325,
                "final_temperature": 298.15,
                "final_pressure": 101325,
            },
            "conversion": 0.5,
        },
    )
    assert response.status_code == 200
    assert response.json()["series"]


def test_components_binary_vle_chart_endpoint_returns_bubble_and_dew_series(client):
    response = client.post(
        "/components/binary-vle/chart",
        json={"fluid1": "Acetone", "fluid2": "Water", "pressure": 101325, "sample_count": 30},
    )
    assert response.status_code == 200
    assert len(response.json()["series"]) == 2


def test_mass_balance_chart_endpoint_returns_sankey_model(client):
    response = client.post(
        "/mass-balance/chart",
        json={
            "components": ["A", "B"],
            "streams": [
                {
                    "name": "Alimentacao_Fresca",
                    "direction": 1,
                    "flow_rate": 100,
                    "compositions": {"A": 1, "B": 0},
                },
                {
                    "name": "Produto",
                    "direction": -1,
                    "flow_rate": None,
                    "compositions": {"A": None, "B": None},
                },
            ],
            "reactions": [
                {"stoichiometry": {"A": -1, "B": 1}, "key_component": "A", "conversion": 0.8}
            ],
            "splits": None,
        },
    )
    assert response.status_code == 200
    assert response.json()["series"]
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run:

```bash
.venv/bin/pytest -q demo/tests/test_reactor_router.py demo/tests/test_components_router.py demo/tests/test_mass_balance_router.py
```

Expected: fail because the dedicated chart endpoints do not exist yet.

- [ ] **Step 3: Refactor the backend plotting logic to return chart models**

Replace the Matplotlib/base64 path in the reactor and mass-balance routers with chart-model construction. The migrated endpoints should return `ChartModel` payloads directly, not `image_base64`.

Add dedicated endpoints for:

- Levenspiel comparison
- Arrhenius
- PFR profile
- recycle/conversion profile
- ternary diagram
- binary VLE
- phase envelope
- property surface
- McCabe-Thiele

Keep the existing numeric endpoints unchanged so the frontend can migrate in steps.

- [ ] **Step 4: Run the targeted backend tests**

Run:

```bash
.venv/bin/pytest -q demo/tests/test_reactor_router.py demo/tests/test_components_router.py demo/tests/test_mass_balance_router.py
```

Expected: pass.

- [ ] **Step 5: Commit the visual endpoint migration**

```bash
git add -f routers/reactor.py routers/components_router.py routers/mass_balance.py models/reactor.py models/mass_balance.py models/charting.py schemas.py demo/tests/test_reactor_router.py demo/tests/test_components_router.py demo/tests/test_mass_balance_router.py
git commit -m "feat: move reactor and visual endpoint math to backend"
```

---

### Task 4: Add the frontend chart model types and generic SVG renderer

**Files:**
- Create: `frontend/src/types/chart-model.ts`
- Create: `frontend/src/components/viz/chart-model-renderer.tsx`
- Modify: `frontend/src/components/viz/chart-grid.tsx`
- Modify: `frontend/src/components/viz/chart-axis-utils.ts`
- Modify: `frontend/src/components/chart-panel.tsx`
- Create: `frontend/src/test/chart-model-renderer.test.tsx`

- [ ] **Step 1: Write failing renderer tests**

```tsx
import { render, screen } from "@testing-library/react";
import { ChartModelRenderer } from "@/components/viz/chart-model-renderer";

it("renders axes, series, and markers from a backend chart model", () => {
  render(
    <ChartModelRenderer
      model={{
        id: "moody",
        title: "Moody",
        axes: {
          x: { scale: "log", label: "Re", domain: { min: 1_000, max: 10_000_000 }, ticks: [1_000, 10_000_000] },
          y: { scale: "log", label: "f", domain: { min: 0.001, max: 0.1 }, ticks: [0.001, 0.01, 0.1] },
        },
        series: [{ id: "curve", kind: "line", points: [{ x: 1_000, y: 0.04 }] }],
        markers: [{ id: "op", x: 50_000, y: 0.0215, label: "operating point" }],
      }}
    />,
  );

  expect(screen.getByText("Moody")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```bash
cd /home/jpbgr/Área de trabalho/Projetos/Pessoais/TCC/frontend
npm test -- --run src/test/chart-model-renderer.test.tsx
```

Expected: fail because the renderer and chart-model types do not exist yet.

- [ ] **Step 3: Implement the shared frontend chart model and renderer**

```ts
export type ChartModel = {
  id: string;
  title: string;
  subtitle?: string;
  approximationNotice?: string;
  axes: {
    x: AxisModel;
    y: AxisModel;
  };
  series: SeriesModel[];
  markers?: MarkerModel[];
  annotations?: AnnotationModel[];
  metadata?: {
    version: string;
    units?: Record<string, string>;
  };
};
```

Implement `ChartModelRenderer` so it:

- reads axes and series from the backend model
- draws SVG paths/markers from precomputed points
- does not recompute ticks, domains, or sample points
- can be reused by all migrated visual components

Keep `chart-grid.tsx` and `chart-axis-utils.ts` as render-only helpers where necessary; remove local axis generation logic that duplicates backend work.

- [ ] **Step 4: Run the frontend renderer test and the existing chart utility tests**

Run:

```bash
npm test -- --run src/test/chart-model-renderer.test.tsx src/test/chart-axis-utils.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit the frontend renderer foundation**

```bash
git add -f frontend/src/types/chart-model.ts frontend/src/components/viz/chart-model-renderer.tsx frontend/src/components/viz/chart-grid.tsx frontend/src/components/viz/chart-axis-utils.ts frontend/src/components/chart-panel.tsx frontend/src/test/chart-model-renderer.test.tsx
git commit -m "feat: add backend chart model renderer"
```

---

### Task 5: Migrate the core frontend pages to backend chart models

**Files:**
- Modify: `frontend/src/features/flow/flow-page.tsx`
- Modify: `frontend/src/features/pump/pump-page.tsx`
- Modify: `frontend/src/features/reactor/reactor-page.tsx`
- Modify: `frontend/src/features/flow/example.ts`
- Modify: `frontend/src/features/pump/example.ts`
- Modify: `frontend/src/features/reactor/presets.ts`
- Modify: `frontend/src/features/flow/didactics.tsx`
- Modify: `frontend/src/features/pump/didactics.tsx`
- Modify: `frontend/src/features/reactor/didactics.tsx`
- Modify: `frontend/src/test/flow-page.test.tsx`
- Modify: `frontend/src/test/pump-page.test.tsx`
- Modify: `frontend/src/test/reactor-page.test.tsx`

- [ ] **Step 1: Write failing page tests that assert the page consumes backend chart models**

```tsx
it("loads a backend chart model for the Moody chart without recalculating axis ticks locally", async () => {
  render(<FlowPage />);
  await user.click(screen.getByRole("button", { name: /carregar exemplo/i }));
  expect(await screen.findByText(/Moody/i)).toBeInTheDocument();
  expect(screen.queryByTestId("local-axis-helper")).not.toBeInTheDocument();
});

it("renders pump curve data returned by the backend", async () => {
  render(<PumpPage />);
  await user.click(screen.getByRole("button", { name: /calcular perda de carga/i }));
  expect(await screen.findByText(/Curva da bomba e do sistema/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the page tests and confirm they fail**

Run:

```bash
cd /home/jpbgr/Área de trabalho/Projetos/Pessoais/TCC/frontend
npm test -- --run src/test/flow-page.test.tsx src/test/pump-page.test.tsx src/test/reactor-page.test.tsx
```

Expected: fail because the pages still depend on local chart math.

- [ ] **Step 3: Replace local graph math with backend model fetching**

Update the page submit handlers so they:

- call the existing numeric endpoint for the engineering result when needed
- call the new chart endpoint for the display model
- pass the returned model into `ChartModelRenderer`
- stop using page-local helpers like `buildHeadlossCurvePoints`, `buildPlotPoints`, `buildHeadTerms`, and `syncHeadlossFlowVelocity` for chart construction

Preserve the form and tab UI so the user experience stays almost identical.

- [ ] **Step 4: Run the page tests again**

Run:

```bash
npm test -- --run src/test/flow-page.test.tsx src/test/pump-page.test.tsx src/test/reactor-page.test.tsx
```

Expected: pass.

- [ ] **Step 5: Commit the core page migration**

```bash
git add -f frontend/src/features/flow/flow-page.tsx frontend/src/features/pump/pump-page.tsx frontend/src/features/reactor/reactor-page.tsx frontend/src/features/flow/example.ts frontend/src/features/pump/example.ts frontend/src/features/reactor/presets.ts frontend/src/features/flow/didactics.tsx frontend/src/features/pump/didactics.tsx frontend/src/features/reactor/didactics.tsx frontend/src/test/flow-page.test.tsx frontend/src/test/pump-page.test.tsx frontend/src/test/reactor-page.test.tsx
git commit -m "feat: move core frontend charts to backend models"
```

---

### Task 6: Migrate components, balance, and exercises to backend chart models

**Files:**
- Modify: `frontend/src/features/components/components-page.tsx`
- Modify: `frontend/src/features/balance/balance-page.tsx`
- Modify: `frontend/src/features/exercises/exercises-page.tsx`
- Modify: `frontend/src/components/viz/binary-vle-chart.tsx`
- Modify: `frontend/src/components/viz/ternary-diagram.tsx`
- Modify: `frontend/src/components/viz/phase-envelope-chart.tsx`
- Modify: `frontend/src/components/viz/property-surface-heatmap.tsx`
- Modify: `frontend/src/components/viz/mccabe-thiele-chart.tsx`
- Modify: `frontend/src/components/viz/process-sankey.tsx`
- Modify: `frontend/src/components/viz/stream-graph.tsx`
- Modify: `frontend/src/components/viz/recycle-purge-map.tsx`
- Modify: `frontend/src/components/viz/heat-exchanger-thermal-charts.tsx`
- Modify: `frontend/src/test/components-page.test.tsx`
- Modify: `frontend/src/test/balance-page.test.tsx`
- Modify: `frontend/src/test/exercises-page.test.tsx`
- Modify: `frontend/tests/e2e/calculations.spec.ts`

- [ ] **Step 1: Write failing tests for the remaining backend-driven visuals**

```tsx
it("renders the binary VLE chart from backend points", async () => {
  render(<ComponentsPage />);
  await user.click(screen.getByRole("button", { name: /gerar binary vle/i }));
  expect(await screen.findByTestId("binary-vle-chart")).toBeInTheDocument();
});

it("renders a backend Sankey model on the balance page", async () => {
  render(<BalancePage />);
  await user.click(screen.getByRole("button", { name: /calcular balanço/i }));
  expect(await screen.findByTestId("process-sankey")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run:

```bash
cd /home/jpbgr/Área de trabalho/Projetos/Pessoais/TCC/frontend
npm test -- --run src/test/components-page.test.tsx src/test/balance-page.test.tsx src/test/exercises-page.test.tsx
```

Expected: fail because the pages still use local sampling or local curve math.

- [ ] **Step 3: Replace component-page and exercises-page visual math with backend payloads**

Update the remaining pages so they:

- request backend chart models for the selected tab
- stop calculating ternary, binary VLE, phase-envelope, property-surface, McCabe-Thiele, Sankey, and recycle/purge shapes in the client
- keep the same buttons, tabs, labels, and result sections
- reuse `ChartModelRenderer` everywhere possible instead of custom per-chart math

Where the UI only needs a table or numeric result, keep the current rendering and remove only the chart-side math.

- [ ] **Step 4: Run the tests again**

Run:

```bash
npm test -- --run src/test/components-page.test.tsx src/test/balance-page.test.tsx src/test/exercises-page.test.tsx
```

Expected: pass.

- [ ] **Step 5: Commit the auxiliary visual migration**

```bash
git add -f frontend/src/features/components/components-page.tsx frontend/src/features/balance/balance-page.tsx frontend/src/features/exercises/exercises-page.tsx frontend/src/components/viz/binary-vle-chart.tsx frontend/src/components/viz/ternary-diagram.tsx frontend/src/components/viz/phase-envelope-chart.tsx frontend/src/components/viz/property-surface-heatmap.tsx frontend/src/components/viz/mccabe-thiele-chart.tsx frontend/src/components/viz/process-sankey.tsx frontend/src/components/viz/stream-graph.tsx frontend/src/components/viz/recycle-purge-map.tsx frontend/src/components/viz/heat-exchanger-thermal-charts.tsx frontend/src/test/components-page.test.tsx frontend/src/test/balance-page.test.tsx frontend/src/test/exercises-page.test.tsx frontend/tests/e2e/calculations.spec.ts
git commit -m "feat: move auxiliary frontend visuals to backend models"
```

---

### Task 7: Remove dead frontend math, tighten regressions, and run the full verification set

**Files:**
- Modify: `frontend/src/components/viz/moody-chart.tsx`
- Modify: `frontend/src/components/viz/pump-system-curve.tsx`
- Modify: `frontend/src/components/viz/levenspiel-chart.tsx`
- Modify: `frontend/src/components/viz/arrhenius-plot.tsx`
- Modify: `frontend/src/components/viz/pfr-profile-chart.tsx`
- Modify: `frontend/src/components/viz/head-breakdown-chart.tsx`
- Modify: `frontend/src/components/viz/headloss-curve.tsx`
- Modify: `frontend/src/components/viz/pump-efficiency-map.tsx`
- Modify: `frontend/src/components/viz/npsh-gauge.tsx`
- Modify: `frontend/src/components/viz/velocity-profile.tsx`
- Modify: `frontend/src/components/viz/stream-table.tsx`
- Modify: `frontend/package.json`
- Modify: `frontend/src/test/*` as needed for the final backend-driven assertions

- [ ] **Step 1: Write the final regression guard tests**

```ts
import { readFileSync } from "node:fs";
import path from "node:path";

it("does not expose local chart sampling helpers in migrated renderers", () => {
  const source = readFileSync(
    path.resolve(process.cwd(), "src/components/viz/moody-chart.tsx"),
    "utf8",
  );
  expect(source).not.toMatch(/build[A-Z]|Math\.pow|Math\.log10|toFixed\(/);
});
```

Use the real test files instead of adding generic lint assertions where possible. The useful regressions are the ones that fail when a migrated component starts sampling or ticking locally again.

- [ ] **Step 2: Run the full frontend and backend suites**

Run:

```bash
cd /home/jpbgr/Área de trabalho/Projetos/Pessoais/TCC/frontend
npm test
npm run build
cd /home/jpbgr/Área de trabalho/Projetos/Pessoais/TCC
.venv/bin/pytest -q
```

Expected: all pass.

- [ ] **Step 3: Remove dead code and unused dependencies**

Clean up:

- helpers that only existed to sample curves or build ticks locally
- frontend imports that are no longer used after the model migration
- the `recharts` dependency if no file uses it after the refactor

Do not remove code still needed for pure layout or non-migrated UI behavior.

- [ ] **Step 4: Run the final focused verification again**

Run:

```bash
cd /home/jpbgr/Área de trabalho/Projetos/Pessoais/TCC/frontend
npm test -- --run src/test/chart-model-renderer.test.tsx src/test/flow-page.test.tsx src/test/pump-page.test.tsx src/test/reactor-page.test.tsx src/test/components-page.test.tsx src/test/balance-page.test.tsx src/test/exercises-page.test.tsx
```

Expected: pass.

- [ ] **Step 5: Commit the cleanup**

```bash
git add -f frontend/package.json frontend/src/components/viz/moody-chart.tsx frontend/src/components/viz/pump-system-curve.tsx frontend/src/components/viz/levenspiel-chart.tsx frontend/src/components/viz/arrhenius-plot.tsx frontend/src/components/viz/pfr-profile-chart.tsx frontend/src/components/viz/head-breakdown-chart.tsx frontend/src/components/viz/headloss-curve.tsx frontend/src/components/viz/pump-efficiency-map.tsx frontend/src/components/viz/npsh-gauge.tsx frontend/src/components/viz/velocity-profile.tsx frontend/src/components/viz/stream-table.tsx
git commit -m "refactor: remove frontend chart math leftovers"
```

---

## Coverage Check

- Spec goal covered: Task 1 defines the shared chart contract; Tasks 2-6 move every charting path to backend-owned endpoints; Task 7 removes leftovers.
- Interface stability covered: Tasks 4-6 preserve the current layout and only swap data sources.
- All-math-goes-backend rule covered: Tasks 1-3 move sampling, ticks, markers, and approximations into backend helpers and endpoints.
- Regression coverage covered: Tasks 1-7 add backend endpoint tests, frontend renderer tests, page tests, and a full-suite verification pass.

## Execution Order

1. Backend chart foundation
2. Flow and pump chart endpoints
3. Reactor, components, and mass-balance chart endpoints
4. Frontend generic renderer
5. Core page migration
6. Auxiliary visual migration
7. Dead-code cleanup and full verification
