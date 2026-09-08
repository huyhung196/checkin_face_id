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

# Directories
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
DB_FILE = os.path.join(BASE_DIR, "checkin.db")

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
