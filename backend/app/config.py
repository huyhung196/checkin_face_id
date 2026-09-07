import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = os.path.dirname(BASE_DIR)

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
FACE_MATCH_THRESHOLD = 0.50        # Euclidean distance < 0.50 is recognized as employee
DUPLICATE_FACE_THRESHOLD = 0.45    # Euclidean distance < 0.45 warns of duplicate face
MAX_DESCRIPTORS_PER_EMPLOYEE = 6   # Multi-shot samples (front, left, right, smile, etc.)
