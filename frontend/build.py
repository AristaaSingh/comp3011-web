from pathlib import Path
import os
import shutil


ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"
ASSETS = ROOT / "assets"
API_BASE = os.getenv("FRONTEND_API_BASE", "http://127.0.0.1:8000")


def main() -> None:
    if DIST.exists():
        shutil.rmtree(DIST)

    DIST.mkdir(parents=True, exist_ok=True)
    shutil.copytree(ASSETS, DIST / "assets")
    (DIST / "assets" / "config.js").write_text(f'window.API_BASE = "{API_BASE}";\n')

    for page in ("index.html", "results.html", "recipe-form.html", "recipe-detail.html", "nutrition.html"):
        shutil.copy2(ROOT / page, DIST / page)


if __name__ == "__main__":
    main()
