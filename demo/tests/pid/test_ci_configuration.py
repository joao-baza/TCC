from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
CI_WORKFLOW = ROOT / ".github" / "workflows" / "ci.yml"


def _indented_block(text: str, header: str, indentation: int) -> str:
    lines = text.splitlines()
    header_line = f"{' ' * indentation}{header}:"
    start = lines.index(header_line)
    block = [lines[start]]

    for line in lines[start + 1 :]:
        if line and not line.startswith(" " * (indentation + 1)):
            break
        block.append(line)

    return "\n".join(block)


def _markdown_section(text: str, heading: str) -> str:
    lines = text.splitlines()
    start = lines.index(heading)
    level = len(heading) - len(heading.lstrip("#"))
    block = [lines[start]]

    for line in lines[start + 1 :]:
        if line.startswith("#"):
            next_level = len(line) - len(line.lstrip("#"))
            if next_level <= level:
                break
        block.append(line)

    return "\n".join(block)


def test_backend_ci_runs_pid_integrations_with_postgres_and_redis() -> None:
    workflow = CI_WORKFLOW.read_text(encoding="utf-8")
    backend_job = _indented_block(workflow, "backend-test", 2)

    assert "    services:\n" in backend_job
    assert "      postgres:\n        image: postgres:16-alpine\n" in backend_job
    assert "          POSTGRES_DB: dcou_test\n" in backend_job
    assert "          POSTGRES_USER: dcou\n" in backend_job
    assert "          POSTGRES_PASSWORD: dcou_test\n" in backend_job
    assert "          - 5432:5432\n" in backend_job
    assert '--health-cmd "pg_isready -U dcou -d dcou_test"' in backend_job
    assert "--health-interval 2s" in backend_job
    assert "--health-timeout 2s" in backend_job
    assert "--health-retries 20" in backend_job

    assert "      redis:\n        image: redis:7.4-alpine\n" in backend_job
    assert "          - 6379:6379\n" in backend_job
    assert '--health-cmd "redis-cli ping"' in backend_job

    assert "    env:\n" in backend_job
    assert (
        "      PID_TEST_DATABASE_URL: "
        "postgresql+psycopg://dcou:dcou_test@127.0.0.1:5432/dcou_test\n"
        in backend_job
    )
    assert "      PID_TEST_REDIS_URL: redis://127.0.0.1:6379/0\n" in backend_job
    assert "      - run: pytest -q\n" in backend_job
    assert "      - name: Validate P&ID catalog manifests\n" in backend_job
    assert "          python -m pid.catalog.validator\n" in backend_job
    assert "          pid/catalog/manifests/isa/foundation.json\n" in backend_job
    assert "          pid/catalog/manifests/iso/foundation.json\n" in backend_job


def test_readme_documents_the_pid_foundation_workflow_and_boundaries() -> None:
    readme = (ROOT / "README.md").read_text(encoding="utf-8")

    required_guidance = (
        "#### P&ID Foundation",
        "##### Run the foundation locally",
        "##### Configuration and operations reference",
        "cp .env.example .env",
        'python -c "import secrets; print(secrets.token_urlsafe(48))"',
        "docker compose -f deploy/docker-compose.test.yaml up -d --wait",
        "postgresql+psycopg://dcou:dcou_test@127.0.0.1:55432/dcou_test",
        "redis://127.0.0.1:56379/0",
        "alembic upgrade head",
        "python -m pid.catalog.validator",
        "pid/catalog/manifests/isa/foundation.json",
        "pid/catalog/manifests/iso/foundation.json",
        "`/health`",
        "`/ready`",
        "single quotes",
        "percent-encoded",
        "PostgreSQL",
        "Redis",
        "SVG",
        "PNG",
        "calculations",
    )

    for guidance in required_guidance:
        assert guidance in readme, f"README is missing P&ID guidance: {guidance}"

    local_development = _markdown_section(readme, "### Local Development")
    assert "#### P&ID Foundation" in local_development
