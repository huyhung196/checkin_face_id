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
    early_leave_buffer_minutes: int = 0,
    break_start_time: str = "12:00",
    break_end_time: str = "13:30",
    has_lunch_break: bool = True
) -> Dict[str, Any]:
    """Cập nhật cấu hình ca làm việc bao gồm mốc giờ nghỉ trưa"""
    now_str = get_vietnam_now().isoformat()
    clean_start = (start_time or "08:00").strip()
    clean_end = (end_time or "17:30").strip()
    clean_name = (shift_name or "Ca Hành Chính").strip()
    clean_b_start = (break_start_time or "12:00").strip()
    clean_b_end = (break_end_time or "13:30").strip()
    has_break_val = 1 if has_lunch_break else 0

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO shift_settings (
            id, shift_name, start_time, end_time, grace_period_minutes, early_leave_buffer_minutes,
            break_start_time, break_end_time, has_lunch_break, is_active, updated_at
        )
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        ON CONFLICT(id) DO UPDATE SET
            shift_name = excluded.shift_name,
            start_time = excluded.start_time,
            end_time = excluded.end_time,
            grace_period_minutes = excluded.grace_period_minutes,
            early_leave_buffer_minutes = excluded.early_leave_buffer_minutes,
            break_start_time = excluded.break_start_time,
            break_end_time = excluded.break_end_time,
            has_lunch_break = excluded.has_lunch_break,
            is_active = 1,
            updated_at = excluded.updated_at
    """, (
        clean_name, clean_start, clean_end, int(grace_period_minutes), int(early_leave_buffer_minutes),
        clean_b_start, clean_b_end, has_break_val, now_str
    ))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": f"Đã lưu cài đặt ca: {clean_name} ({clean_start} - {clean_end}, Nghỉ trưa {clean_b_start} - {clean_b_end})",
        "data": {
            "id": 1,
            "shift_name": clean_name,
            "start_time": clean_start,
            "end_time": clean_end,
            "grace_period_minutes": int(grace_period_minutes),
            "early_leave_buffer_minutes": int(early_leave_buffer_minutes),
            "break_start_time": clean_b_start,
            "break_end_time": clean_b_end,
            "has_lunch_break": bool(has_break_val),
            "updated_at": now_str
        }
    }


def calculate_working_duration(
    checkin_dt: datetime,
    checkout_dt: datetime,
    shift_settings: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Tính thời lượng làm việc thực tế, tự động trừ giờ nghỉ trưa (nếu có giao thoa).
    """
    if not shift_settings:
        shift_settings = get_shift_settings()

    gross_seconds = max(0, (checkout_dt - checkin_dt).total_seconds())
    deducted_break_seconds = 0

    has_break = bool(shift_settings.get("has_lunch_break", 1))
    break_start_str = shift_settings.get("break_start_time", "12:00") or "12:00"
    break_end_str = shift_settings.get("break_end_time", "13:30") or "13:30"

    if has_break:
        try:
            b_start_parts = break_start_str.split(":")
            b_end_parts = break_end_str.split(":")
            b_start_h, b_start_m = int(b_start_parts[0]), int(b_start_parts[1])
            b_end_h, b_end_m = int(b_end_parts[0]), int(b_end_parts[1])

            break_start_dt = checkin_dt.replace(hour=b_start_h, minute=b_start_m, second=0, microsecond=0)
            break_end_dt = checkin_dt.replace(hour=b_end_h, minute=b_end_m, second=0, microsecond=0)

            if break_end_dt > break_start_dt:
                # Tính khoảng giao thoa giữa thời gian làm việc và khoảng nghỉ trưa
                overlap_start = max(checkin_dt, break_start_dt)
                overlap_end = min(checkout_dt, break_end_dt)
                if overlap_end > overlap_start:
                    deducted_break_seconds = (overlap_end - overlap_start).total_seconds()
        except Exception:
            deducted_break_seconds = 0

    net_seconds = max(0, gross_seconds - deducted_break_seconds)
    hrs = int(net_seconds // 3600)
    mins = int((net_seconds % 3600) // 60)
    working_hours = round(net_seconds / 3600.0, 2)
    working_duration = f"{hrs}h {mins}p" if hrs > 0 else f"{mins} phút"

    return {
        "gross_seconds": gross_seconds,
        "net_seconds": net_seconds,
        "deducted_break_seconds": deducted_break_seconds,
        "deducted_break_minutes": int(deducted_break_seconds // 60),
        "working_hours": working_hours,
        "working_duration": working_duration
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
