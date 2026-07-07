from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def read(rel_path: str) -> str:
    return (ROOT / rel_path).read_text(encoding="utf-8")


def test_vite_entry_points_to_react_bootstrap():
    html = read("frontend/index.html")

    assert '<div id="root"></div>' in html
    assert '<script type="module" src="/src/main.tsx"></script>' in html


def test_legacy_frontend_runtime_artifacts_were_removed():
    forbidden_paths = (
        "frontend/js",
        "frontend/vendor",
        "frontend/css/styles.css",
        "frontend/css/tailwind.css",
        "frontend/css/tailwind-input.css",
        "frontend/tailwind.config.js",
        "frontend/next.config.ts",
        "frontend/next-env.d.ts",
    )

    for rel_path in forbidden_paths:
        assert not (ROOT / rel_path).exists(), rel_path
