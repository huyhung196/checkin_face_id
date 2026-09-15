"""
Script di chuyển toàn bộ dữ liệu từ SQLite cục bộ (checkin.db) lên Turso Cloud Database.
Cách dùng:
    python migrate_to_turso.py
"""

import os
import sqlite3
import sys

# Đảm bảo import được app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Đảm bảo stdout không lỗi encoding trên Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from app.config import DB_FILE, TURSO_DATABASE_URL, TURSO_AUTH_TOKEN
from app.database import init_db

def migrate():
    print("=" * 60)
    print(">>> BAT DAU DONG BO DU LIEU TU SQLITE LEN TURSO CLOUD")
    print("=" * 60)

    # 1. Kiểm tra cấu hình Turso
    turso_url = TURSO_DATABASE_URL or os.getenv("TURSO_DATABASE_URL", "").strip()
    turso_token = TURSO_AUTH_TOKEN or os.getenv("TURSO_AUTH_TOKEN", "").strip()

    if not turso_url:
        turso_url = input("👉 Nhập TURSO_DATABASE_URL (vd: libsql://your-db.turso.io): ").strip()
    if not turso_token:
        turso_token = input("👉 Nhập TURSO_AUTH_TOKEN: ").strip()

    if not turso_url:
        print("❌ Thiếu TURSO_DATABASE_URL. Dừng tiến trình.")
        return

    try:
        import libsql
    except ImportError:
        print("❌ Chưa cài đặt thư viện 'libsql'. Hãy chạy: pip install libsql")
        return

    if not os.path.exists(DB_FILE):
        print(f"⚠️ Không tìm thấy file SQLite cục bộ tại: {DB_FILE}")
        print("Sẽ chỉ khởi tạo cấu trúc bảng trên Turso...")
        local_conn = None
    else:
        print(f"📂 Đọc dữ liệu từ SQLite cục bộ: {DB_FILE}")
        local_conn = sqlite3.connect(DB_FILE)
        local_conn.row_factory = sqlite3.Row

    # 2. Kết nối Turso
    print(f"🌐 Đang kết nối tới Turso Cloud ({turso_url})...")
    turso_conn = libsql.connect(turso_url, auth_token=turso_token)

    # 3. Khởi tạo bảng trên Turso nếu chưa có
    # Tạm thời set biến môi trường để init_db chạy trên Turso
    os.environ["TURSO_DATABASE_URL"] = turso_url
    os.environ["TURSO_AUTH_TOKEN"] = turso_token
    from app import config
    config.TURSO_DATABASE_URL = turso_url
    config.TURSO_AUTH_TOKEN = turso_token

    print("🛠️ Đang khởi tạo các bảng trên Turso...")
    init_db()
    print("✅ Các bảng trên Turso đã sẵn sàng!")

    if not local_conn:
        print("🎉 Hoàn thành khởi tạo database trên Turso!")
        return

    # 4. Danh sách các bảng cần copy
    tables = [
        "employees",
        "checkin_logs",
        "gps_settings",
        "gps_checkin_logs",
        "shift_settings"
    ]

    local_cur = local_conn.cursor()
    turso_cur = turso_conn.cursor()

    total_migrated = 0

    for table in tables:
        try:
            # Lấy danh sách cột thực tế của bảng trên Turso
            turso_cur.execute(f"PRAGMA table_info({table})")
            turso_cols = [c[1] for c in turso_cur.fetchall()]

            local_cur.execute(f"SELECT * FROM {table}")
            rows = local_cur.fetchall()
            if not rows:
                print(f"⏩ Bảng '{table}': 0 bản ghi (bỏ qua).")
                continue

            local_cols = [col[0] for col in local_cur.description]
            # Chỉ lấy các cột có mặt ở cả bảng local và bảng Turso
            common_cols = [c for c in local_cols if c in turso_cols]

            cols_str = ", ".join(common_cols)
            placeholders = ", ".join(["?"] * len(common_cols))

            query = f"INSERT OR REPLACE INTO {table} ({cols_str}) VALUES ({placeholders})"

            count = 0
            for r in rows:
                values = [r[col] for col in common_cols]
                turso_cur.execute(query, tuple(values))
                count += 1

            turso_conn.commit()
            total_migrated += count
            print(f"✅ Bảng '{table}': Đã đồng bộ {count} bản ghi.")
        except Exception as e:
            print(f"⚠️ Lỗi khi đồng bộ bảng '{table}': {e}")

    local_conn.close()
    turso_conn.close()

    print("=" * 60)
    print(f"🎉 HOÀN THÀNH! Tổng cộng {total_migrated} bản ghi đã được đồng bộ lên Turso Cloud.")
    print("=" * 60)

if __name__ == "__main__":
    migrate()
