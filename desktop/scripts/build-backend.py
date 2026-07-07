from pathlib import Path
import subprocess
import sys


def main() -> None:
    desktop_dir = Path(__file__).resolve().parents[1]
    repo_root = desktop_dir.parent
    dist_dir = desktop_dir / "dist"
    work_dir = desktop_dir / "build"

    dist_dir.mkdir(parents=True, exist_ok=True)
    work_dir.mkdir(parents=True, exist_ok=True)

    command = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--clean",
        "--noconfirm",
        "--onedir",
        "--name",
        "backend",
        "--distpath",
        str(dist_dir),
        "--workpath",
        str(work_dir),
        "--specpath",
        str(work_dir),
        "--collect-all",
        "CoolProp",
        "--collect-all",
        "scipy",
        "--collect-all",
        "matplotlib",
        str(repo_root / "app.py"),
    ]

    subprocess.run(command, check=True)


if __name__ == "__main__":
    main()

