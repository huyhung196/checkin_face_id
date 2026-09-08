from datetime import datetime
from typing import Dict, Any, Optional
from app.config import get_vietnam_now
from app.database import get_db

def get_shift_settings() -> Dict[str, Any]:
    """Lấy cấu hình ca làm việc hiện tại, tự động tạo ca mặc định nếu chưa có"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM shift_settings WHERE id = 1")
    row = cursor.fetchone()
    
    if not row:
        now_str = get_vietnam_now().isoformat()
        cursor.execute("""
            INSERT INTO shift_settings (id, shift_name, start_time, end_time, grace_period_minutes, early_leave_buffer_minutes, is_active, updated_at)
            VALUES (1, 'Ca Hành Chính Mebieco', '08:00', '17:30', 15, 0, 1, ?)
        """, (now_str,))
        conn.commit()
        cursor.execute("SELECT * FROM shift_settings WHERE id = 1")
        row = cursor.fetchone()
        
    conn.close()
    return dict(row)


def save_shift_settings(
    shift_name: str = "Ca Hành Chính Mebieco",
    start_time: str = "08:00",
    end_time: str = "17:30",
    grace_period_minutes: int = 15,
    early_leave_buffer_minutes: int = 0
) -> Dict[str, Any]:
    """Cập nhật cấu hình ca làm việc"""
    now_str = get_vietnam_now().isoformat()
    clean_start = (start_time or "08:00").strip()
    clean_end = (end_time or "17:30").strip()
    clean_name = (shift_name or "Ca Hành Chính").strip()

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO shift_settings (id, shift_name, start_time, end_time, grace_period_minutes, early_leave_buffer_minutes, is_active, updated_at)
        VALUES (1, ?, ?, ?, ?, ?, 1, ?)
        ON CONFLICT(id) DO UPDATE SET
            shift_name = excluded.shift_name,
            start_time = excluded.start_time,
            end_time = excluded.end_time,
            grace_period_minutes = excluded.grace_period_minutes,
            early_leave_buffer_minutes = excluded.early_leave_buffer_minutes,
            is_active = 1,
            updated_at = excluded.updated_at
    """, (clean_name, clean_start, clean_end, int(grace_period_minutes), int(early_leave_buffer_minutes), now_str))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": f"Đã lưu cài đặt ca làm việc: {clean_name} ({clean_start} - {clean_end}, ân hạn {grace_period_minutes}p)",
        "data": {
            "id": 1,
            "shift_name": clean_name,
            "start_time": clean_start,
            "end_time": clean_end,
            "grace_period_minutes": int(grace_period_minutes),
            "early_leave_buffer_minutes": int(early_leave_buffer_minutes),
            "updated_at": now_str
        }
    }


def parse_time_to_minutes(time_str: str) -> int:
    """Chuyển chuỗi HH:MM hoặc HH:MM:SS thành số phút trong ngày"""
    try:
        parts = time_str.strip().split(":")
        hours = int(parts[0])
        minutes = int(parts[1]) if len(parts) > 1 else 0
        return hours * 60 + minutes
    except Exception:
        return 0


def evaluate_attendance(
    check_type: str,
    checkin_dt: datetime,
    shift_settings: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Thẩm định lượt điểm danh: Phát hiện Đi Trễ khi Vào Ca hoặc Về Sớm khi Tan Ca
    - check_type: "Vào Ca" hoặc "Tan Ca"
    - checkin_dt: datetime thực tế
    """
    if not shift_settings:
        shift_settings = get_shift_settings()

    start_time_str = shift_settings.get("start_time", "08:00")
    end_time_str = shift_settings.get("end_time", "17:30")
    grace_period = int(shift_settings.get("grace_period_minutes", 15))
    early_buffer = int(shift_settings.get("early_leave_buffer_minutes", 0))

    actual_minutes = checkin_dt.hour * 60 + checkin_dt.minute
    start_minutes = parse_time_to_minutes(start_time_str)
    end_minutes = parse_time_to_minutes(end_time_str)

    attendance_status = "Đúng Giờ"
    late_minutes = 0
    early_minutes = 0
    status_detail = "Đúng giờ quy định"

    if check_type == "Vào Ca":
        threshold_minutes = start_minutes + grace_period
        if actual_minutes > threshold_minutes:
            late_minutes = actual_minutes - start_minutes
            attendance_status = "Đi Trễ"
            hrs = late_minutes // 60
            mins = late_minutes % 60
            late_text = f"{hrs}h {mins}p" if hrs > 0 else f"{mins} phút"
            status_detail = f"Đi trễ {late_text} (Quy định: {start_time_str}, Ân hạn đến: {threshold_minutes // 60:02d}:{threshold_minutes % 60:02d})"
        else:
            attendance_status = "Đúng Giờ"
            status_detail = f"Vào ca đúng giờ (Chuẩn {start_time_str})"
    else:
        # Tan Ca
        threshold_minutes = end_minutes - early_buffer
        if actual_minutes < threshold_minutes:
            early_minutes = end_minutes - actual_minutes
            attendance_status = "Về Sớm"
            hrs = early_minutes // 60
            mins = early_minutes % 60
            early_text = f"{hrs}h {mins}p" if hrs > 0 else f"{mins} phút"
            status_detail = f"Về sớm {early_text} (Giờ tan ca chuẩn: {end_time_str})"
        else:
            attendance_status = "Đúng Giờ"
            status_detail = f"Tan ca đúng giờ (Sau {end_time_str})"

    return {
        "attendance_status": attendance_status,
        "late_minutes": late_minutes,
        "early_minutes": early_minutes,
        "status_detail": status_detail
    }
