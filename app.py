import os
import sys


def get_version() -> str:
    """
    Get the application version.

    Priority:
    1. APP_VERSION env var (for Docker/custom deployments)
    2. Bundled version.txt (baked in during PyInstaller build)
    3. Fallback to "0.0.0"
    """
    # Priority 1: Environment variable override
    env_version = os.environ.get("APP_VERSION")
    if env_version:
        return env_version

    # Priority 2: Read from bundled version.txt
    try:
        if getattr(sys, "frozen", False):
            # Running as PyInstaller bundle - version.txt is in _internal/
            bundle_dir = os.path.dirname(sys.executable)
            version_file = os.path.join(bundle_dir, "_internal", "version.txt")
        else:
            # Running as script - version.txt is in project root
            version_file = os.path.join(os.path.dirname(__file__), "version.txt")

        if os.path.exists(version_file):
            with open(version_file) as f:
                return f.read().strip()
    except Exception:
        pass

    return "0.0.0"


# Handle --version flag BEFORE importing Flask to avoid initialization overhead
# This allows Electron to quickly verify the backend binary is valid
if __name__ == "__main__" and len(sys.argv) > 1 and sys.argv[1] == "--version":
    print(get_version())
    sys.exit(0)

from api import app  # noqa: E402 - intentionally after --version check to avoid Flask init overhead
from core import config  # noqa: E402

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=config.SERVER_PORT)
