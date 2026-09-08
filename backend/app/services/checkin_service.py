import os
from datetime import datetime
from typing import Dict, Any, List, Optional

from app.config import UPLOAD_DIR
from app.database import get_db
from app.services.employee_service import save_base64_image, get_all_employees, get_employee_by_id
from app.services.face_service import match_live_face_against_database

def parse_device_info(user_agent: str) -> str:
    """Phân tích chuỗi User-Agent thành tên OS & Browser dễ đọc"""
    if not user_agent:
        return "Không rõ"
    ua_lower = user_agent.lower()
    os_name = "Khác"
    if "windows" in ua_lower: os_name = "Windows"
    elif "android" in ua_lower: os_name = "Android"
    elif "iphone" in ua_lower or "ipad" in ua_lower: os_name = "iOS"
    elif "macintosh" in ua_lower or "mac os" in ua_lower: os_name = "macOS"
    elif "linux" in ua_lower: os_name = "Linux"
        
    browser_name = "Trình duyệt"
    if "edg" in ua_lower: browser_name = "Edge"
    elif "coccoc" in ua_lower: browser_name = "Cốc Cốc"
    elif "chrome" in ua_lower and "safari" in ua_lower: browser_name = "Chrome"
    elif "safari" in ua_lower and "chrome" not in ua_lower: browser_name = "Safari"
    elif "firefox" in ua_lower: browser_name = "Firefox"
        
    return f"{os_name} ({browser_name})"


def record_checkin(
    image_base64: str,
    user_name: Optional[str] = "",
    employee_id: Optional[int] = None,
    employee_code: Optional[str] = "",
    match_confidence: Optional[float] = 0.0,
    face_descriptors: Optional[List[List[float]]] = None,
    face_descriptor: Optional[List[float]] = None,
    user_agent: str = "",
    user_lat: Optional[float] = None,
    user_lng: Optional[float] = None,
    public_ip: str = "",
    local_ip: str = ""
) -> Dict[str, Any]:
    """Ghi nhận điểm danh Face ID & Tọa độ GPS và lưu log vào SQLite"""
    
    # 1. Lưu ảnh snapshot
    photo_url = save_base64_image(image_base64, prefix="checkin")
    device_info = parse_device_info(user_agent)

    # 2. Chuẩn hóa vector live
    candidate_descriptors: List[List[float]] = []
    if face_descriptors:
        candidate_descriptors.extend([d for d in face_descriptors if isinstance(d, list) and len(d) == 128])
    if face_descriptor and isinstance(face_descriptor, list) and len(face_descriptor) == 128:
        candidate_descriptors.append(face_descriptor)

    # 3. Thực hiện so khớp AI phía Server nếu có vector
    matched_employee = None
    all_employees = get_all_employees()

    if candidate_descriptors:
        ai_match = match_live_face_against_database(candidate_descriptors, all_employees)
        if ai_match["matched"] and ai_match["employee"] and ai_match.get("confidence", 0) >= 50.0:
            matched_employee = ai_match["employee"]
            employee_id = matched_employee["id"]
            employee_code = matched_employee["employee_code"]
            user_name = matched_employee["full_name"]
            match_confidence = ai_match["confidence"]
        else:
            matched_employee = None
            employee_id = None
            employee_code = ""
            user_name = "Người lạ"
            match_confidence = 0.0
    elif employee_id:
        emp = get_employee_by_id(employee_id)
        if emp:
            matched_employee = emp
            employee_code = emp["employee_code"]
            user_name = emp["full_name"]

    # 3.1. CHẶN NGƯỜI LẠ: Nếu không nhận diện được nhân viên -> Từ chối điểm danh, không lưu DB
    if not matched_employee or not employee_id:
        if photo_url:
            full_path = os.path.join(UPLOAD_DIR, os.path.basename(photo_url))
            if os.path.exists(full_path):
                try:
                    os.remove(full_path)
                except Exception:
                    pass
        return {
            "success": False,
            "is_matched": False,
            "message": "Không nhận diện được khuôn mặt nhân viên! Người lạ không được phép điểm danh.",
            "employee": None,
            "data": None
        }

    status = "Xác nhận đúng nhân viên"
    final_name = user_name.strip()

    def _cleanup_photo():
        if photo_url:
            fp = os.path.join(UPLOAD_DIR, os.path.basename(photo_url))
            if os.path.exists(fp):
                try:
                    os.remove(fp)
                except Exception:
                    pass

    # 3.5. BẮT BUỘC KIỂM TRA GPS:
    from app.services.gps_service import get_gps_settings, haversine_distance
    gps_settings = get_gps_settings()
    
    # Điều kiện 1: Hệ thống bắt buộc phải cài đặt GPS mục tiêu
    if not gps_settings or not gps_settings.get("is_configured"):
        _cleanup_photo()
        return {
            "success": False,
            "is_matched": True,
            "message": "Hệ thống chưa cài đặt vị trí GPS mục tiêu! Vui lòng cấu hình vị trí GPS trong phần Quản trị trước khi điểm danh.",
            "employee": matched_employee,
            "data": None
        }

    # Điều kiện 2: Thiết bị người dùng bắt buộc phải gửi tọa độ GPS
    if user_lat is None or user_lng is None:
        _cleanup_photo()
        return {
            "success": False,
            "is_matched": True,
            "message": "Không nhận được tọa độ GPS của bạn! Vui lòng bật định vị (GPS) trên thiết bị và cấp quyền vị trí cho trình duyệt trước khi điểm danh.",
            "employee": matched_employee,
            "data": None
        }

    # Điều kiện 3: Khoảng cách thực tế phải nằm trong bán kính cho phép
    target_lat = gps_settings["latitude"]
    target_lng = gps_settings["longitude"]
    gps_radius = gps_settings["radius_meters"]
    gps_distance = haversine_distance(user_lat, user_lng, target_lat, target_lng)
    gps_matched = 1 if gps_distance <= gps_radius else 0
    gps_status = f"Đạt ({gps_distance}m)" if gps_matched else f"Không đạt ({gps_distance}m / Cho phép {gps_radius}m)"

    if not gps_matched:
        _cleanup_photo()
        return {
            "success": False,
            "is_matched": True,
            "message": f"Điểm danh không thành công: Vị trí của bạn ({gps_distance}m) vượt quá bán kính GPS cho phép ({gps_radius}m)!",
            "employee": matched_employee,
            "data": None
        }

    # 4. Xác định loại điểm danh (Vào Ca / Tan Ca) theo quy tắc Lần đầu là Vào – Lần cuối là Ra
    now = datetime.now()
    timestamp = now.isoformat()
    formatted_time = now.strftime("%H:%M:%S - %d/%m/%Y")
    time_only_str = now.strftime("%H:%M:%S")
    today_str = now.strftime("%Y-%m-%d")

    check_type = "Vào Ca"
    working_hours = 0.0
    working_duration = "---"
    first_checkin_time = None

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT timestamp, formatted_time FROM checkin_logs
        WHERE employee_id = ? AND timestamp LIKE ?
        ORDER BY id ASC
    """, (employee_id, f"{today_str}%"))
    today_logs = cursor.fetchall()

    if len(today_logs) == 0:
        # Lần quét đầu tiên trong ngày -> Tự động tính là Vào Ca
        check_type = "Vào Ca"
        working_hours = 0.0
        working_duration = "---"
        success_message = f"🟢 Vào Ca thành công: {final_name} ({time_only_str})"
    else:
        # Lần quét tiếp theo trong ngày -> Tự động tính là Tan Ca
        check_type = "Tan Ca"
        first_log = today_logs[0]
        first_ts = first_log["timestamp"]
        first_checkin_time = first_log["formatted_time"]
        try:
            first_dt = datetime.fromisoformat(first_ts)
            elapsed_secs = max(0, (now - first_dt).total_seconds())
            hrs = int(elapsed_secs // 3600)
            mins = int((elapsed_secs % 3600) // 60)
            working_hours = round(elapsed_secs / 3600.0, 2)
            working_duration = f"{hrs}h {mins}p" if hrs > 0 else f"{mins} phút"
        except Exception:
            working_hours = 0.0
            working_duration = "---"

        success_message = f"🔴 Tan Ca thành công: {final_name} ({time_only_str}) - Đã làm: {working_duration}"

    cursor.execute("""
        INSERT INTO checkin_logs (
            timestamp, formatted_time, public_ip, local_ip, photo_path, 
            employee_id, employee_code, user_name, match_confidence, 
            status, device_info, user_agent,
            user_lat, user_lng, gps_distance, gps_radius, gps_matched, gps_status,
            check_type, working_hours, working_duration
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        timestamp, formatted_time, public_ip, local_ip, photo_url,
        employee_id, employee_code, final_name, match_confidence or 0.0,
        status, device_info, user_agent,
        user_lat, user_lng, gps_distance, gps_radius, gps_matched, gps_status,
        check_type, working_hours, working_duration
    ))

    log_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {
        "success": True,
        "is_matched": bool(matched_employee),
        "message": success_message,
        "employee": matched_employee,
        "data": {
            "id": log_id,
            "timestamp": timestamp,
            "formatted_time": formatted_time,
            "photo_path": photo_url,
            "employee_id": employee_id,
            "employee_code": employee_code,
            "user_name": final_name,
            "match_confidence": match_confidence,
            "status": status,
            "device_info": device_info,
            "user_lat": user_lat,
            "user_lng": user_lng,
            "gps_distance": gps_distance,
            "gps_radius": gps_radius,
            "gps_matched": gps_matched,
            "gps_status": gps_status,
            "check_type": check_type,
            "working_hours": working_hours,
            "working_duration": working_duration,
            "first_checkin_time": first_checkin_time
        }
    }


def get_checkin_logs(limit: int = 50, search: str = "", date_filter: str = "") -> Dict[str, Any]:
    """Lấy danh sách nhật ký điểm danh và các số liệu thống kê"""
    conn = get_db()
    cursor = conn.cursor()

    query = "SELECT * FROM checkin_logs WHERE 1=1"
    params = []

    if date_filter:
        query += " AND timestamp LIKE ?"
        params.append(f"{date_filter}%")

    if search:
        query += " AND (user_name LIKE ? OR employee_code LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term])

    query += " ORDER BY id DESC LIMIT ?"
    params.append(limit)

    cursor.execute(query, params)
    rows = cursor.fetchall()

    today_str = datetime.now().strftime("%Y-%m-%d")
    cursor.execute("SELECT COUNT(*) as count FROM checkin_logs WHERE timestamp LIKE ?", (f"{today_str}%",))
    today_count = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) as count FROM checkin_logs")
    total_count = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) as count FROM employees")
    total_employees = cursor.fetchone()["count"]

    conn.close()

    return {
        "logs": [dict(r) for r in rows],
        "today_count": today_count,
        "total_count": total_count,
        "total_employees": total_employees
    }


def delete_checkin_log(log_id: int) -> bool:
    """Xóa 1 bản ghi log và file ảnh đính kèm"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT photo_path FROM checkin_logs WHERE id = ?", (log_id,))
    row = cursor.fetchone()
    photo_file = row["photo_path"] if row else None

    cursor.execute("DELETE FROM checkin_logs WHERE id = ?", (log_id,))
    conn.commit()
    conn.close()

    if photo_file:
        file_name = os.path.basename(photo_file)
        full_file_path = os.path.join(UPLOAD_DIR, file_name)
        if os.path.exists(full_file_path):
            try: os.remove(full_file_path)
            except: pass

    return True
