import sqlite3
import json
from typing import Dict, Any, List, Optional
from app.config import DB_FILE

def get_db():
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
        user_agent TEXT
    )
    """)

    # Tự động migrate nếu bảng cũ thiếu cột
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

    conn.commit()
    conn.close()
