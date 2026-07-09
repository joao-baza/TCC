from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
WORKFLOWS = [
    ROOT / ".github" / "workflows" / "ci.yml",
    ROOT / ".github" / "workflows" / "desktop-publish.yml",
]
REQUIRED_RELEASE_PATTERNS = {
    "desktop/release/*.exe",
    "desktop/release/*.exe.sha256",
    "desktop/release/*.dmg",
    "desktop/release/*.dmg.sha256",
    "desktop/release/*.AppImage",
    "desktop/release/*.AppImage.sha256",
}
REQUIRED_PUBLISH_PATTERNS = {
    "desktop-release/*.exe",
    "desktop-release/*.exe.sha256",
    "desktop-release/*.dmg",
    "desktop-release/*.dmg.sha256",
    "desktop-release/*.AppImage",
    "desktop-release/*.AppImage.sha256",
}


def test_desktop_workflows_do_not_upload_entire_release_directories():
    for workflow in WORKFLOWS:
        content = workflow.read_text(encoding="utf-8")

        assert "desktop/release/**" not in content
        assert "desktop-release/**" not in content


def test_desktop_workflows_upload_only_final_release_assets():
    for workflow in WORKFLOWS:
        content = workflow.read_text(encoding="utf-8")
        lines = {line.strip() for line in content.splitlines()}

        missing_patterns = (REQUIRED_RELEASE_PATTERNS | REQUIRED_PUBLISH_PATTERNS) - lines

        assert not missing_patterns, (
            f"{workflow.name} is missing expected release asset patterns: "
            f"{sorted(missing_patterns)}"
        )
