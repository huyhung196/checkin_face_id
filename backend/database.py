import sqlite3
import os
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from app.config import get_vietnam_now

DB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(DB_DIR, "checkin.db")

def get_db():
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # 1. Bảng nhân viên (Employees) & vector đặc trưng khuôn mặt (128D Face Descriptor)
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
        face_descriptor TEXT, -- JSON array 128 floats
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
    cursor.execute("PRAGMA table_info(checkin_logs)")
    columns = [col[1] for col in cursor.fetchall()]
    if "public_ip" not in columns:
        cursor.execute("ALTER TABLE checkin_logs ADD COLUMN public_ip TEXT DEFAULT '127.0.0.1'")
    if "local_ip" not in columns:
        cursor.execute("ALTER TABLE checkin_logs ADD COLUMN local_ip TEXT DEFAULT '127.0.0.1'")
    if "employee_id" not in columns:
        cursor.execute("ALTER TABLE checkin_logs ADD COLUMN employee_id INTEGER")
    if "employee_code" not in columns:
        cursor.execute("ALTER TABLE checkin_logs ADD COLUMN employee_code TEXT")
    if "match_confidence" not in columns:
        cursor.execute("ALTER TABLE checkin_logs ADD COLUMN match_confidence REAL DEFAULT 0.0")
    
    conn.commit()
    conn.close()

# ==================== EMPLOYEE CRUD ====================

def get_all_employees() -> List[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM employees ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    
    results = []
    for r in rows:
        item = dict(r)
        # Parse JSON descriptor nếu có
        if item.get("face_descriptor"):
            try:
                item["face_descriptor"] = json.loads(item["face_descriptor"])
                item["has_face"] = True
            except:
                item["has_face"] = False
        else:
            item["has_face"] = False
        results.append(item)
    return results

def get_employee_by_id(emp_id: int) -> Optional[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM employees WHERE id = ?", (emp_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        item = dict(row)
        if item.get("face_descriptor"):
            try:
                item["face_descriptor"] = json.loads(item["face_descriptor"])
                item["has_face"] = True
            except:
                item["has_face"] = False
        return item
    return None

def insert_employee(
    employee_code: str,
    full_name: str,
    department: str = "Phòng Ban",
    position: str = "Nhân viên",
    phone: str = "",
    email: str = "",
    avatar_path: str = "",
    face_descriptor: Optional[List[float]] = None
) -> Dict[str, Any]:
    now_str = get_vietnam_now().strftime("%Y-%m-%d %H:%M:%S")
    desc_json = json.dumps(face_descriptor) if face_descriptor else None
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO employees (employee_code, full_name, department, position, phone, email, avatar_path, face_descriptor, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (employee_code, full_name, department, position, phone, email, avatar_path, desc_json, now_str))
    
    emp_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {
        "id": emp_id,
        "employee_code": employee_code,
        "full_name": full_name,
        "department": department,
        "position": position,
        "phone": phone,
        "email": email,
        "avatar_path": avatar_path,
        "has_face": bool(face_descriptor),
        "created_at": now_str
    }

def update_employee_face(emp_id: int, face_descriptor: List[float], avatar_path: str = ""):
    conn = get_db()
    cursor = conn.cursor()
    desc_json = json.dumps(face_descriptor)
    
    if avatar_path:
        cursor.execute("UPDATE employees SET face_descriptor = ?, avatar_path = ? WHERE id = ?", (desc_json, avatar_path, emp_id))
    else:
        cursor.execute("UPDATE employees SET face_descriptor = ? WHERE id = ?", (desc_json, emp_id))
        
    conn.commit()
    conn.close()

def delete_employee(emp_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT avatar_path FROM employees WHERE id = ?", (emp_id,))
    row = cursor.fetchone()
    avatar = row["avatar_path"] if row else None
    
    cursor.execute("DELETE FROM employees WHERE id = ?", (emp_id,))
    conn.commit()
    conn.close()
    return avatar

# ==================== CHECK-IN LOGS ====================

def insert_log(
    public_ip: str,
    local_ip: str,
    photo_path: str,
    user_name: str,
    employee_id: Optional[int] = None,
    employee_code: Optional[str] = "",
    match_confidence: float = 0.0,
    status: str = "Success",
    device_info: str = "Không rõ",
    user_agent: str = ""
):
    now = get_vietnam_now()
    timestamp = now.isoformat()
    formatted_time = now.strftime("%H:%M:%S - %d/%m/%Y")
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO checkin_logs (
            timestamp, formatted_time, public_ip, local_ip, photo_path, 
            employee_id, employee_code, user_name, match_confidence, 
            status, device_info, user_agent
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        timestamp, formatted_time, public_ip, local_ip, photo_path,
        employee_id, employee_code, user_name, match_confidence,
        status, device_info, user_agent
    ))
    conn.commit()
    log_id = cursor.lastrowid
    conn.close()
    
    return {
        "id": log_id,
        "timestamp": timestamp,
        "formatted_time": formatted_time,
        "user_name": user_name,
        "employee_code": employee_code,
        "photo_path": photo_path,
        "match_confidence": match_confidence,
        "device_info": device_info,
        "status": status
    }

def get_checkin_logs(limit: int = 50, search: str = "") -> Dict[str, Any]:
    """Lấy danh sách điểm danh, thống kê tổng và hôm nay"""
    conn = get_db()
    cursor = conn.cursor()
    
    query = "SELECT * FROM checkin_logs WHERE 1=1"
    params = []
    
    if search:
        query += " AND (user_name LIKE ? OR employee_code LIKE ? OR public_ip LIKE ? OR local_ip LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term, term])
        
    query += " ORDER BY id DESC LIMIT ?"
    params.append(limit)
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    today_str = get_vietnam_now().strftime("%Y-%m-%d")
    cursor.execute("SELECT COUNT(*) as count FROM checkin_logs WHERE timestamp LIKE ?", (f"{today_str}%",))
    today_count = cursor.fetchone()["count"]
    
    cursor.execute("SELECT COUNT(*) as count FROM checkin_logs")
    total_count = cursor.fetchone()["count"]
    
    # Đếm số nhân viên
    cursor.execute("SELECT COUNT(*) as count FROM employees")
    total_employees = cursor.fetchone()["count"]
    
    conn.close()
    
    return {
        "logs": [dict(r) for r in rows],
        "today_count": today_count,
        "total_count": total_count,
        "total_employees": total_employees
    }

def delete_log(log_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT photo_path FROM checkin_logs WHERE id = ?", (log_id,))
    row = cursor.fetchone()
    
    photo_file = None
    if row and row["photo_path"]:
        photo_file = row["photo_path"]
        
    cursor.execute("DELETE FROM checkin_logs WHERE id = ?", (log_id,))
    conn.commit()
    conn.close()
    
    return photo_file
