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

    conn.commit()
    conn.close()
