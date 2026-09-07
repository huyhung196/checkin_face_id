import math
from datetime import datetime
from typing import Dict, Any, List, Optional
from app.database import get_db
from app.services.checkin_service import parse_device_info

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Tính khoảng cách tuyệt đối theo đường vòng Trái Đất (mét) giữa 2 điểm tọa độ GPS (Lat/Lng)
    """
    R = 6371000.0  # Bán kính Trái Đất trung bình (mét)
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)


def get_gps_settings() -> Optional[Dict[str, Any]]:
    """Lấy thông tin cấu hình vị trí mục tiêu & bán kính cho phép hiện tại"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM gps_settings WHERE id = 1")
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None
    return dict(row)


def save_gps_settings(location_name: str, latitude: float, longitude: float, radius_meters: float) -> Dict[str, Any]:
    """Cập nhật hoặc khởi tạo cấu hình vị trí mục tiêu GPS"""
    now_str = datetime.now().isoformat()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO gps_settings (id, location_name, latitude, longitude, radius_meters, is_configured, updated_at)
        VALUES (1, ?, ?, ?, ?, 1, ?)
        ON CONFLICT(id) DO UPDATE SET
            location_name = excluded.location_name,
            latitude = excluded.latitude,
            longitude = excluded.longitude,
            radius_meters = excluded.radius_meters,
            is_configured = 1,
            updated_at = excluded.updated_at
    """, (location_name.strip() or "Văn Phòng Công Ty", latitude, longitude, radius_meters, now_str))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": f"Đã lưu cài đặt GPS: {location_name} (Bán kính cho phép {radius_meters}m)",
        "data": {
            "id": 1,
            "location_name": location_name,
            "latitude": latitude,
            "longitude": longitude,
            "radius_meters": radius_meters,
            "is_configured": 1,
            "updated_at": now_str
        }
    }


def reset_gps_settings() -> bool:
    """Reset xóa cài đặt vị trí GPS mục tiêu (is_configured = 0) mà vẫn giữ nguyên nhật ký log"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE gps_settings SET is_configured = 0 WHERE id = 1")
    conn.commit()
    conn.close()
    return True


def record_gps_checkin(
    user_lat: float,
    user_lng: float,
    user_name: Optional[str] = "Người dùng",
    employee_id: Optional[int] = None,
    employee_code: Optional[str] = "",
    user_agent: str = "",
    public_ip: str = "",
    local_ip: str = ""
) -> Dict[str, Any]:
    """Xử lý điểm danh GPS: So sánh tọa độ hiện tại với mục tiêu và lưu log"""
    settings = get_gps_settings()
    if not settings or not settings.get("is_configured"):
        return {
            "success": False,
            "message": "Chưa cài đặt vị trí GPS mục tiêu. Vui lòng thiết lập vị trí trước khi điểm danh!",
            "is_valid": False
        }

    target_lat = settings["latitude"]
    target_lng = settings["longitude"]
    radius_meters = settings["radius_meters"]
    loc_name = settings.get("location_name", "Văn Phòng")

    # Tính khoảng cách
    dist_m = haversine_distance(user_lat, user_lng, target_lat, target_lng)
    is_valid = (dist_m <= radius_meters)
    
    status_text = f"Đạt (Trong bán kính {dist_m}m)" if is_valid else f"Không đạt - Vượt bán kính ({dist_m}m / Cho phép {radius_meters}m)"
    device_info = parse_device_info(user_agent)

    now = datetime.now()
    timestamp = now.isoformat()
    formatted_time = now.strftime("%H:%M:%S - %d/%m/%Y")
    final_user_name = user_name.strip() if user_name else "Người dùng GPS"

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO gps_checkin_logs (
            timestamp, formatted_time, user_name, employee_id, employee_code,
            user_lat, user_lng, target_lat, target_lng, distance_meters,
            radius_meters, is_valid, status, public_ip, local_ip, device_info, user_agent
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        timestamp, formatted_time, final_user_name, employee_id, employee_code,
        user_lat, user_lng, target_lat, target_lng, dist_m,
        radius_meters, 1 if is_valid else 0, status_text, public_ip, local_ip, device_info, user_agent
    ))

    log_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {
        "success": True,
        "is_valid": is_valid,
        "distance_meters": dist_m,
        "radius_meters": radius_meters,
        "target_location_name": loc_name,
        "message": f"Điểm danh GPS ĐẠT: Bạn đang ở trong bán kính {dist_m}m" if is_valid else f"CẢNH BÁO: Vị trí của bạn ({dist_m}m) vượt bán kính cho phép ({radius_meters}m)!",
        "data": {
            "id": log_id,
            "timestamp": timestamp,
            "formatted_time": formatted_time,
            "user_name": final_user_name,
            "employee_id": employee_id,
            "employee_code": employee_code,
            "user_lat": user_lat,
            "user_lng": user_lng,
            "target_lat": target_lat,
            "target_lng": target_lng,
            "distance_meters": dist_m,
            "radius_meters": radius_meters,
            "is_valid": is_valid,
            "status": status_text,
            "public_ip": public_ip,
            "local_ip": local_ip,
            "device_info": device_info
        }
    }


def get_gps_logs(limit: int = 50) -> List[Dict[str, Any]]:
    """Lấy danh sách lịch sử điểm danh GPS"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM gps_checkin_logs ORDER BY id DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def delete_gps_log(log_id: int) -> bool:
    """Xóa bản ghi điểm danh GPS theo ID"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM gps_checkin_logs WHERE id = ?", (log_id,))
    conn.commit()
    conn.close()
    return True
