import os
import json
import re
import base64
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional

from app.config import UPLOAD_DIR, MAX_DESCRIPTORS_PER_EMPLOYEE, DUPLICATE_FACE_THRESHOLD
from app.database import get_db
from app.services.face_service import check_for_duplicate_face

def save_base64_image(image_str: str, prefix: str = "avatar") -> str:
    """Lưu ảnh base64 vào thư mục uploads/ và trả về relative URL"""
    if not image_str:
        return ""
        
    ext = "jpg"
    match = re.match(r"^data:image/(\w+);base64,", image_str)
    if match:
        ext = match.group(1).lower()
        if ext not in ["jpg", "jpeg", "png", "webp"]:
            ext = "jpg"
        image_str = image_str[match.end():]
        
    try:
        image_bytes = base64.b64decode(image_str)
        now = datetime.now()
        file_name = f"{prefix}_{now.strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}.{ext}"
        file_path = os.path.join(UPLOAD_DIR, file_name)
        
        with open(file_path, "wb") as f:
            f.write(image_bytes)
            
        return f"/uploads/{file_name}"
    except Exception as e:
        print(f"Lỗi khi lưu ảnh base64: {e}")
        return ""


def get_all_employees() -> List[Dict[str, Any]]:
    """Lấy danh sách toàn bộ nhân viên và giải mã mảng descriptors"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM employees ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    
    results = []
    for r in rows:
        item = dict(r)
        desc_list = []
        raw = item.get("face_descriptors")
        if raw:
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, list):
                    # Nếu là danh sách các vector [[...128], [...128]]
                    if len(parsed) > 0 and isinstance(parsed[0], list):
                        desc_list = parsed
                    elif len(parsed) == 128 and isinstance(parsed[0], (int, float)):
                        # Tương thích nếu là 1 vector đơn lẻ
                        desc_list = [parsed]
            except:
                pass
        item["face_descriptors"] = desc_list
        item["sample_count"] = len(desc_list)
        item["has_face"] = len(desc_list) > 0
        results.append(item)
        
    return results


def get_employee_by_id(emp_id: int) -> Optional[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM employees WHERE id = ?", (emp_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return None
        
    item = dict(row)
    desc_list = []
    raw = item.get("face_descriptors")
    if raw:
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                if len(parsed) > 0 and isinstance(parsed[0], list):
                    desc_list = parsed
                elif len(parsed) == 128 and isinstance(parsed[0], (int, float)):
                    desc_list = [parsed]
        except:
            pass
    item["face_descriptors"] = desc_list
    item["sample_count"] = len(desc_list)
    item["has_face"] = len(desc_list) > 0
    return item


def create_employee(
    employee_code: str,
    full_name: str,
    department: str = "Phòng Ban",
    position: str = "Nhân viên",
    phone: str = "",
    email: str = "",
    avatar_image: str = "",
    face_descriptors: Optional[List[List[float]]] = None,
    face_descriptor: Optional[List[float]] = None,
    force_create: bool = False
) -> Dict[str, Any]:
    """Tạo nhân viên mới kèm kiểm tra trùng lặp khuôn mặt"""
    
    # Chuẩn hóa danh sách vector
    normalized_descriptors: List[List[float]] = []
    if face_descriptors and isinstance(face_descriptors, list):
        for d in face_descriptors:
            if isinstance(d, list) and len(d) == 128:
                normalized_descriptors.append(d)
    elif face_descriptor and isinstance(face_descriptor, list) and len(face_descriptor) == 128:
        normalized_descriptors.append(face_descriptor)

    # 1. Kiểm tra trùng khuôn mặt nếu có vector và không bật force_create
    if normalized_descriptors and not force_create:
        all_emps = get_all_employees()
        dup_check = check_for_duplicate_face(normalized_descriptors, all_emps, threshold=DUPLICATE_FACE_THRESHOLD)
        if dup_check["is_duplicate"]:
            return {
                "success": False,
                "is_duplicate": True,
                "duplicate_info": dup_check,
                "message": dup_check["message"]
            }

    # 2. Lưu avatar nếu có
    avatar_url = ""
    if avatar_image:
        avatar_url = save_base64_image(avatar_image, prefix="avatar")

    # 3. Lưu vào Database
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    desc_json = json.dumps(normalized_descriptors) if normalized_descriptors else None

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO employees (employee_code, full_name, department, position, phone, email, avatar_path, face_descriptors, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (employee_code.strip().upper(), full_name.strip(), department, position, phone, email, avatar_url, desc_json, now_str))

    emp_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {
        "success": True,
        "is_duplicate": False,
        "data": {
            "id": emp_id,
            "employee_code": employee_code.strip().upper(),
            "full_name": full_name.strip(),
            "department": department,
            "position": position,
            "phone": phone,
            "email": email,
            "avatar_path": avatar_url,
            "sample_count": len(normalized_descriptors),
            "has_face": len(normalized_descriptors) > 0,
            "created_at": now_str
        }
    }


def append_employee_descriptors(
    emp_id: int,
    new_descriptors: List[List[float]],
    avatar_image: Optional[str] = None
) -> Dict[str, Any]:
    """Bổ sung thêm góc chụp/mẫu khuôn mặt cho nhân viên đã có"""
    emp = get_employee_by_id(emp_id)
    if not emp:
        return {"success": False, "message": f"Không tìm thấy nhân viên #{emp_id}"}

    existing_descriptors = emp.get("face_descriptors") or []
    
    # Lọc và thêm các vector mới hợp lệ
    for d in new_descriptors:
        if isinstance(d, list) and len(d) == 128:
            existing_descriptors.append(d)

    # Giới hạn số lượng mẫu tối đa
    existing_descriptors = existing_descriptors[-MAX_DESCRIPTORS_PER_EMPLOYEE:]

    avatar_path = emp.get("avatar_path") or ""
    if avatar_image:
        avatar_path = save_base64_image(avatar_image, prefix="avatar")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE employees 
        SET face_descriptors = ?, avatar_path = ?
        WHERE id = ?
    """, (json.dumps(existing_descriptors), avatar_path, emp_id))
    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": f"Đã cập nhật {len(existing_descriptors)} mẫu khuôn mặt cho nhân viên '{emp['full_name']}'!",
        "sample_count": len(existing_descriptors)
    }


def delete_employee(emp_id: int) -> bool:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT avatar_path FROM employees WHERE id = ?", (emp_id,))
    row = cursor.fetchone()
    avatar = row["avatar_path"] if row else None

    cursor.execute("DELETE FROM employees WHERE id = ?", (emp_id,))
    conn.commit()
    conn.close()

    if avatar:
        file_name = os.path.basename(avatar)
        full_file_path = os.path.join(UPLOAD_DIR, file_name)
        if os.path.exists(full_file_path):
            try: os.remove(full_file_path)
            except: pass

    return True
