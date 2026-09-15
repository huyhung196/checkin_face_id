import sqlite3
import os
import json
import logging
from typing import Dict, Any, List, Optional
from app.config import DB_FILE, TURSO_DATABASE_URL, TURSO_AUTH_TOKEN

logger = logging.getLogger("database")

class RowDict(dict):
    """
    Tương thích 100% với sqlite3.Row:
    - Truy cập theo tên cột: row['employee_code']
    - Truy cập theo chỉ số cột: row[1]
    - Hỗ trợ dict(row)
    - Hỗ trợ row.get('key', default)
    """
    def __init__(self, cols, vals):
        super().__init__(zip(cols, vals))
        self._vals = list(vals) if vals else []

    def __getitem__(self, key):
        if isinstance(key, int):
            return self._vals[key]
        return super().__getitem__(key)


class LibsqlCursorWrapper:
    """Wrapper cho cursor của libsql để tương thích với API sqlite3 Cursor"""
    def __init__(self, raw_cursor):
        self._cur = raw_cursor

    def execute(self, sql, params=()):
        if params is None:
            params = ()
        return self._cur.execute(sql, params)

    def executemany(self, sql, seq_of_params):
        return self._cur.executemany(sql, seq_of_params)

    def _get_cols(self):
        if self._cur.description:
            return [col[0] for col in self._cur.description]
        return []

    def fetchone(self):
        r = self._cur.fetchone()
        if r is None:
            return None
        return RowDict(self._get_cols(), r)

    def fetchall(self):
        rows = self._cur.fetchall()
        cols = self._get_cols()
        return [RowDict(cols, r) for r in rows]

    def fetchmany(self, size=None):
        rows = self._cur.fetchmany(size) if size is not None else self._cur.fetchmany()
        cols = self._get_cols()
        return [RowDict(cols, r) for r in rows]

    @property
    def lastrowid(self):
        return getattr(self._cur, "lastrowid", None)

    @property
    def rowcount(self):
        return getattr(self._cur, "rowcount", -1)

    @property
    def description(self):
        return self._cur.description

    def close(self):
        return self._cur.close()

    def __iter__(self):
        cols = self._get_cols()
        for r in self._cur:
            yield RowDict(cols, r)


class LibsqlConnectionWrapper:
    """Wrapper cho connection của libsql"""
    def __init__(self, raw_conn):
        self._conn = raw_conn

    def cursor(self):
        return LibsqlCursorWrapper(self._conn.cursor())

    def execute(self, sql, params=()):
        cur = self.cursor()
        cur.execute(sql, params)
        return cur

    def commit(self):
        return self._conn.commit()

    def rollback(self):
        return self._conn.rollback()

    def close(self):
        return self._conn.close()

    def sync(self):
        if hasattr(self._conn, "sync"):
            return self._conn.sync()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            self.rollback()
        else:
            self.commit()


def get_db():
    """
    Khởi tạo kết nối CSDL:
    - Nếu có TURSO_DATABASE_URL thì kết nối Turso Cloud SQLite (libSQL).
    - Nếu không có, tự động fallback về SQLite file cục bộ (checkin.db).
    """
    if TURSO_DATABASE_URL:
        try:
            import libsql
            raw_conn = libsql.connect(TURSO_DATABASE_URL, auth_token=TURSO_AUTH_TOKEN)
            return LibsqlConnectionWrapper(raw_conn)
        except Exception as e:
            logger.error(f"[DATABASE] Lỗi kết nối Turso ({TURSO_DATABASE_URL}): {e}. Chuyển về SQLite cục bộ.")
    
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # 1. Bảng nhân viên (Hỗ trợ lưu nhiều vector góc mặt: face_descriptors JSON)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_code TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        department TEXT DEFAULT 'Phòng Ban',
        position TEXT DEFAULT 'Nhân viên',
        phone TEXT,
        email TEXT,
        avatar_path TEXT,
        face_descriptors TEXT, -- JSON array of 128-float arrays: [[...128 floats], [...]]
        created_at TEXT
    )
    """)
    
    # 2. Bảng nhật ký điểm danh (Check-in Logs)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS checkin_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        formatted_time TEXT NOT NULL,
        public_ip TEXT NOT NULL,
        local_ip TEXT,
        photo_path TEXT NOT NULL,
        employee_id INTEGER,
        employee_code TEXT,
        user_name TEXT DEFAULT 'Khách / Nhân viên',
        match_confidence REAL DEFAULT 0.0,
        status TEXT DEFAULT 'Success',
        device_info TEXT DEFAULT 'Không rõ',
        user_agent TEXT,
        user_lat REAL,
        user_lng REAL,
        gps_distance REAL,
        gps_radius REAL,
        gps_matched INTEGER,
        gps_status TEXT,
        check_type TEXT DEFAULT 'Vào Ca',
        working_hours REAL DEFAULT 0.0,
        working_duration TEXT
    )
    """)

    # 3. Bảng cấu hình tọa độ GPS mục tiêu & Bán kính
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS gps_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        location_name TEXT DEFAULT 'Văn Phòng Công Ty',
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        radius_meters REAL DEFAULT 100.0,
        is_configured INTEGER DEFAULT 1,
        updated_at TEXT
    )
    """)

    # 4. Bảng nhật ký điểm danh GPS (GPS Check-in Logs)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS gps_checkin_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        formatted_time TEXT NOT NULL,
        user_name TEXT DEFAULT 'Người dùng',
        employee_id INTEGER,
        employee_code TEXT,
        user_lat REAL NOT NULL,
        user_lng REAL NOT NULL,
        target_lat REAL NOT NULL,
        target_lng REAL NOT NULL,
        distance_meters REAL NOT NULL,
        radius_meters REAL NOT NULL,
        is_valid INTEGER DEFAULT 0,
        status TEXT NOT NULL,
        public_ip TEXT,
        local_ip TEXT,
        device_info TEXT,
        user_agent TEXT
    )
    """)

    # 5. Bảng cấu hình ca làm việc (Shift Settings)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS shift_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        shift_name TEXT DEFAULT 'Ca Hành Chính Mebieco',
        start_time TEXT DEFAULT '08:00',
        end_time TEXT DEFAULT '17:30',
        grace_period_minutes INTEGER DEFAULT 15,
        early_leave_buffer_minutes INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        updated_at TEXT
    )
    """)

    # Khởi tạo bản ghi ca mặc định nếu chưa có
    cursor.execute("SELECT COUNT(*) as count FROM shift_settings WHERE id = 1")
    if cursor.fetchone()["count"] == 0:
        cursor.execute("""
            INSERT INTO shift_settings (id, shift_name, start_time, end_time, grace_period_minutes, early_leave_buffer_minutes, is_active, updated_at)
            VALUES (1, 'Ca Hành Chính Mebieco', '08:00', '17:30', 15, 0, 1, datetime('now'))
        """)

    # Tự động migrate nếu bảng cũ thiếu cột
    cursor.execute("PRAGMA table_info(shift_settings)")
    shift_cols = [col[1] for col in cursor.fetchall()]
    if "break_start_time" not in shift_cols:
        cursor.execute("ALTER TABLE shift_settings ADD COLUMN break_start_time TEXT DEFAULT '12:00'")
    if "break_end_time" not in shift_cols:
        cursor.execute("ALTER TABLE shift_settings ADD COLUMN break_end_time TEXT DEFAULT '13:30'")
    if "has_lunch_break" not in shift_cols:
        cursor.execute("ALTER TABLE shift_settings ADD COLUMN has_lunch_break INTEGER DEFAULT 1")

    cursor.execute("PRAGMA table_info(employees)")
    emp_columns = [col[1] for col in cursor.fetchall()]
    if "face_descriptors" not in emp_columns:
        cursor.execute("ALTER TABLE employees ADD COLUMN face_descriptors TEXT")

    cursor.execute("PRAGMA table_info(checkin_logs)")
    log_columns = [col[1] for col in cursor.fetchall()]
    if "public_ip" not in log_columns:
        cursor.execute("ALTER TABLE checkin_logs ADD COLUMN public_ip TEXT DEFAULT '127.0.0.1'")
    if "local_ip" not in log_columns:
        cursor.execute("ALTER TABLE checkin_logs ADD COLUMN local_ip TEXT DEFAULT '127.0.0.1'")
    if "employee_id" not in log_columns:
        cursor.execute("ALTER TABLE checkin_logs ADD COLUMN employee_id INTEGER")
    if "employee_code" not in log_columns:
        cursor.execute("ALTER TABLE checkin_logs ADD COLUMN employee_code TEXT")
    if "match_confidence" not in log_columns:
        cursor.execute("ALTER TABLE checkin_logs ADD COLUMN match_confidence REAL DEFAULT 0.0")
    if "user_lat" not in log_columns:
        cursor.execute("ALTER TABLE checkin_logs ADD COLUMN user_lat REAL")
    if "user_lng" not in log_columns:
        cursor.execute("ALTER TABLE checkin_logs ADD COLUMN user_lng REAL")
    if "gps_distance" not in log_columns:
        cursor.execute("ALTER TABLE checkin_logs ADD COLUMN gps_distance REAL")
    if "gps_radius" not in log_columns:
        cursor.execute("ALTER TABLE checkin_logs ADD COLUMN gps_radius REAL")
    if "gps_matched" not in log_columns:
        cursor.execute("ALTER TABLE checkin_logs ADD COLUMN gps_matched INTEGER")
    if "gps_status" not in log_columns:
        cursor.execute("ALTER TABLE checkin_logs ADD COLUMN gps_status TEXT")
    if "check_type" not in log_columns:
        cursor.execute("ALTER TABLE checkin_logs ADD COLUMN check_type TEXT DEFAULT 'Vào Ca'")
    if "working_hours" not in log_columns:
        cursor.execute("ALTER TABLE checkin_logs ADD COLUMN working_hours REAL DEFAULT 0.0")
    if "working_duration" not in log_columns:
        cursor.execute("ALTER TABLE checkin_logs ADD COLUMN working_duration TEXT")
    if "attendance_status" not in log_columns:
        cursor.execute("ALTER TABLE checkin_logs ADD COLUMN attendance_status TEXT DEFAULT 'Đúng Giờ'")
    if "late_minutes" not in log_columns:
        cursor.execute("ALTER TABLE checkin_logs ADD COLUMN late_minutes INTEGER DEFAULT 0")
    if "early_minutes" not in log_columns:
        cursor.execute("ALTER TABLE checkin_logs ADD COLUMN early_minutes INTEGER DEFAULT 0")
    if "has_permission" not in log_columns:
        cursor.execute("ALTER TABLE checkin_logs ADD COLUMN has_permission INTEGER DEFAULT 0")
    if "permission_note" not in log_columns:
        cursor.execute("ALTER TABLE checkin_logs ADD COLUMN permission_note TEXT DEFAULT ''")
    if "permission_updated_by" not in log_columns:
        cursor.execute("ALTER TABLE checkin_logs ADD COLUMN permission_updated_by TEXT DEFAULT ''")
    if "permission_updated_at" not in log_columns:
        cursor.execute("ALTER TABLE checkin_logs ADD COLUMN permission_updated_at TEXT DEFAULT ''")

    conn.commit()
    conn.close()
