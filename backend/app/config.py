import os
from datetime import datetime, timezone, timedelta

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = os.path.dirname(BASE_DIR)

# Múi giờ Việt Nam (UTC+7) cho toàn bộ hệ thống
VIETNAM_TZ = timezone(timedelta(hours=7))

def get_vietnam_now() -> datetime:
    """
    Trả về datetime hiện tại chính xác theo múi giờ Việt Nam (UTC+7).
    Bỏ thông tin tzinfo (naive datetime) để tương thích 100% với SQLite, ISO strings và tính toán timedelta.
    """
    return datetime.now(VIETNAM_TZ).replace(tzinfo=None)

# Tự động đọc biến môi trường từ file .env nếu có
def _load_env_file(env_path: str):
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip("\"'")
                    if key and key not in os.environ:
                        os.environ[key] = val
        except Exception:
            pass

_load_env_file(os.path.join(BASE_DIR, ".env"))
_load_env_file(os.path.join(PROJECT_ROOT, ".env"))

# Directories
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
DB_FILE = os.path.join(BASE_DIR, "checkin.db")

# Turso Cloud Database Configuration (libSQL)
# If provided, the system will use Turso Cloud SQLite.
# If left empty, it will automatically fallback to local SQLite (checkin.db).
TURSO_DATABASE_URL = os.getenv("TURSO_DATABASE_URL", "").strip()
TURSO_AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN", "").strip()

FRONTEND_DIST = os.path.join(PROJECT_ROOT, "frontend", "dist")
MODELS_DIR = os.path.join(PROJECT_ROOT, "frontend", "public", "models")
if not os.path.exists(MODELS_DIR):
    MODELS_DIR = os.path.join(FRONTEND_DIST, "models")

ICONS_DIR = os.path.join(PROJECT_ROOT, "frontend", "public", "icons")
if not os.path.exists(ICONS_DIR):
    ICONS_DIR = os.path.join(FRONTEND_DIST, "icons")

LOGO_FILE = os.path.join(PROJECT_ROOT, "logo-icon.svg")

# Ensure required directories exist
os.makedirs(UPLOAD_DIR, exist_ok=True)

# AI Recognition Thresholds
FACE_MATCH_THRESHOLD = 0.40        # Euclidean distance < 0.40 is recognized as employee
DUPLICATE_FACE_THRESHOLD = 0.45    # Euclidean distance < 0.45 warns of duplicate face
MAX_DESCRIPTORS_PER_EMPLOYEE = 25  # Multi-shot samples (5 angles × 5 per angle)
