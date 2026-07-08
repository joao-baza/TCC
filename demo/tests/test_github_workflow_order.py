from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def read_workflow(name: str) -> str:
    return (ROOT / ".github" / "workflows" / name).read_text()


def test_release_pipeline_is_ordered_after_tests():
    ci = read_workflow("ci.yml")

    assert "  frontend-test:\n    runs-on: ubuntu-latest\n    needs: backend-test" in ci
    assert "  frontend-e2e:\n    runs-on: ubuntu-latest\n    needs: frontend-test" in ci
    assert "  publish-frontend:\n    runs-on: ubuntu-latest\n    needs: frontend-e2e" in ci
    assert "  publish-api:\n    runs-on: ubuntu-latest\n    needs: publish-frontend" in ci
    assert "  desktop-smoke:\n    runs-on: ubuntu-latest\n    needs:\n      - frontend-e2e\n      - publish-frontend\n      - publish-api" in ci
    assert "  build-desktop-macos:\n    runs-on: macos-latest\n    needs: desktop-smoke" in ci
    assert "  build-desktop-ubuntu:\n    runs-on: ubuntu-latest\n    needs: build-desktop-macos" in ci


def test_publish_workflows_are_not_independent_push_pipelines():
    docker_publish = read_workflow("docker-publish.yml")
    desktop_publish = read_workflow("desktop-publish.yml")

    assert docker_publish.startswith("name: docker-publish\n\non:\n  workflow_dispatch:\n")
    assert desktop_publish.startswith("name: desktop-publish\n\non:\n  workflow_dispatch:\n")
