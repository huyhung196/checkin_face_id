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

    status = "Xác nhận đúng nhân viên" if matched_employee else "Người lạ"
    final_name = user_name.strip() if (matched_employee and user_name and user_name.strip() not in ["", "Khách / Chưa đăng ký"]) else "Người lạ"

    # 3.5. Đánh giá khoảng cách GPS nếu có tọa độ và cấu hình GPS mục tiêu
    gps_distance = None
    gps_radius = None
    gps_matched = None
    gps_status = "---"

    if user_lat is not None and user_lng is not None:
        from app.services.gps_service import get_gps_settings, haversine_distance
        gps_settings = get_gps_settings()
        if gps_settings and gps_settings.get("is_configured"):
            target_lat = gps_settings["latitude"]
            target_lng = gps_settings["longitude"]
            gps_radius = gps_settings["radius_meters"]
            gps_distance = haversine_distance(user_lat, user_lng, target_lat, target_lng)
            gps_matched = 1 if gps_distance <= gps_radius else 0
            gps_status = f"Đạt ({gps_distance}m)" if gps_matched else f"Không đạt ({gps_distance}m / Cho phép {gps_radius}m)"
        else:
            gps_status = "Chưa cài GPS mục tiêu"

    # 4. Ghi log vào Database
    now = datetime.now()
    timestamp = now.isoformat()
    formatted_time = now.strftime("%H:%M:%S - %d/%m/%Y")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO checkin_logs (
            timestamp, formatted_time, public_ip, local_ip, photo_path, 
            employee_id, employee_code, user_name, match_confidence, 
            status, device_info, user_agent,
            user_lat, user_lng, gps_distance, gps_radius, gps_matched, gps_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        timestamp, formatted_time, public_ip, local_ip, photo_url,
        employee_id, employee_code, final_name, match_confidence or 0.0,
        status, device_info, user_agent,
        user_lat, user_lng, gps_distance, gps_radius, gps_matched, gps_status
    ))

    log_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {
        "success": True,
        "is_matched": bool(matched_employee),
        "message": f"Điểm danh thành công: {final_name} ({match_confidence}%)" if matched_employee else f"Đã lưu ảnh và ghi log điểm danh cho: {final_name}",
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
            "gps_status": gps_status
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
