import os
from pathlib import Path


ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
_ENV_FILE_LOADED = False


def load_env_file() -> None:
    global _ENV_FILE_LOADED

    if _ENV_FILE_LOADED:
        return

    _ENV_FILE_LOADED = True

    if not ENV_PATH.exists():
        return

    for raw_line in ENV_PATH.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("\"'")

        if key and key not in os.environ:
            os.environ[key] = value
