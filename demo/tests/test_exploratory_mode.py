from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def read(rel_path: str) -> str:
    return (ROOT / rel_path).read_text(encoding="utf-8")


def test_static_modules_have_exploratory_panels():
    html = read("frontend/index.html")

    for panel_id in ("sizing-exploratory", "flow-exploratory", "pump-exploratory"):
        assert f'id="{panel_id}"' in html


def test_didatic_module_defines_exploratory_templates_and_hooks():
    didatic = read("frontend/js/modules/didatic.js")

    required_snippets = (
        "pedagogicTemplates",
        "initExploratoryPanels",
        "_applyTemplate",
        "_buildSliders",
        "_renderGuidedSteps",
        "_setupScenarioButtons",
        "_overlayScenarios",
        "_injectDynamicPanels",
    )

    for snippet in required_snippets:
        assert snippet in didatic


def test_all_modules_have_multiple_planned_templates():
    didatic = read("frontend/js/modules/didatic.js")

    assert "'first-order'" in didatic
    assert "'second-order'" in didatic
    assert "'simple-separation'" in didatic
    assert "'recycle-system'" in didatic


def test_balance_panel_includes_slider_container():
    didatic = read("frontend/js/modules/didatic.js")

    assert 'id="balance-sliders"' in didatic


def test_modules_expose_recalculate_surface():
    for rel_path in (
        "frontend/js/modules/flow.js",
        "frontend/js/modules/sizing.js",
        "frontend/js/modules/pump.js",
        "frontend/js/modules/reactor.js",
        "frontend/js/modules/balance.js",
    ):
        source = read(rel_path)
        assert "recalculate(" in source


def test_styles_define_exploratory_panel_classes():
    styles = read("frontend/css/styles.css")

    for selector in (
        ".exploratory-panel",
        ".sliders-section",
        ".guided-step",
        ".scenario-panel",
    ):
        assert selector in styles


def test_tcc_contains_classroom_tutorial_subsection():
    tex = read("escrita/TEX/capitulos/4.5-recursos-didaticos.tex")

    assert r"\subsection{Tutorial de Uso em Sala de Aula}" in tex


def test_static_panels_define_embedded_visual_containers():
    html = read("frontend/index.html")

    required_ids = (
        'id="sizing-exploratory-visuals"',
        'id="flow-exploratory-visuals"',
        'id="pump-exploratory-visuals"',
    )

    for snippet in required_ids:
        assert snippet in html


def test_didatic_module_defines_scroll_alignment_and_visual_hooks():
    didatic = read("frontend/js/modules/didatic.js")

    required_snippets = (
        "_scrollExploratoryPanelIntoView",
        "_renderExploratoryVisuals",
        "_buildExploratoryVisualShell",
        "Modo Exploratório",
        "Roteiro de exploração",
    )

    for snippet in required_snippets:
        assert snippet in didatic


def test_didatic_module_rerenders_visuals_after_slider_recalculation():
    didatic = read("frontend/js/modules/didatic.js")
    start = didatic.index("debounceTimer = window.setTimeout(async () => {")
    end = didatic.index("}, 300);", start)
    debounce_slice = didatic[start:end]

    assert "this._runModuleCalculation(moduleKey, tpl)" in debounce_slice
    assert "this._renderExploratoryVisuals(moduleKey)" in debounce_slice
    assert "_scrollExploratoryPanelIntoView(moduleKey)" not in debounce_slice


def test_modules_expose_embedded_visual_render_surface():
    for rel_path in (
        "frontend/js/modules/flow.js",
        "frontend/js/modules/sizing.js",
        "frontend/js/modules/pump.js",
        "frontend/js/modules/reactor.js",
        "frontend/js/modules/balance.js",
    ):
        source = read(rel_path)
        assert "renderExploratoryVisuals(" in source


def test_styles_define_visual_lab_sections():
    styles = read("frontend/css/styles.css")

    for selector in (
        ".exploratory-visuals",
        ".exploratory-visual-card",
        ".exploratory-placeholder",
    ):
        assert selector in styles
