import csv
import io
from datetime import datetime
from typing import List, Dict, Any
from app.config import get_vietnam_now
from app.services.checkin_service import get_checkin_logs

def generate_attendance_csv(date_filter: str = "", attendance_filter: str = "") -> tuple[io.BytesIO, str]:
    """Tạo file CSV UTF-8 BOM chuẩn tiếng Việt cho Excel kết hợp lọc ngày và tình trạng chấm công"""
    result = get_checkin_logs(limit=10000, date_filter=date_filter, attendance_filter=attendance_filter)
    logs = result["logs"]

    output = io.StringIO()
    output.write('\ufeff')  # UTF-8 BOM cho Excel

    writer = csv.writer(output)
    writer.writerow([
        "ID", 
        "Thời Gian", 
        "Mã Nhân Viên", 
        "Họ Tên", 
        "Loại Điểm Danh",
        "Tình Trạng Ca",
        "Số Phút Đi Trễ",
        "Số Phút Về Sớm",
        "Trạng Thái Xin Phép",
        "Ghi Chú / Lý Do Phép",
        "Người Duyệt Phép",
        "Thời Gian Duyệt",
        "Thời Lượng Làm Việc",
        "Độ Khớp AI (%)", 
        "Khớp GPS", 
        "Thiết Bị & Trình Duyệt", 
        "Đường Dẫn Ảnh"
    ])

    for row in logs:
        att_status = row.get("attendance_status", "Đúng Giờ") or "Đúng Giờ"
        late_min = row.get("late_minutes", 0) or 0
        early_min = row.get("early_minutes", 0) or 0
        has_perm = bool(row.get("has_permission", 0))

        if att_status in ["Đi Trễ", "Về Sớm"]:
            perm_status = "Đã có xin phép" if has_perm else "Không phép / Chưa duyệt"
        else:
            perm_status = "---"

        writer.writerow([
            row["id"],
            row["formatted_time"],
            row.get("employee_code", "") or "---",
            row["user_name"],
            row.get("check_type", "---") or "---",
            att_status,
            f"{late_min} phút" if late_min > 0 else "0",
            f"{early_min} phút" if early_min > 0 else "0",
            perm_status,
            row.get("permission_note", "") or "---",
            row.get("permission_updated_by", "") or "---",
            row.get("permission_updated_at", "") or "---",
            row.get("working_duration", "---") or "---",
            f"{row.get('match_confidence', 0)}%",
            row.get("gps_status", "---"),
            row["device_info"],
            row["photo_path"]
        ])

    output.seek(0)
    tag = f"_{attendance_filter}" if attendance_filter else ""
    date_tag = f"_{date_filter}" if date_filter else ""
    filename = f"face_id_attendance_logs{date_tag}{tag}_{get_vietnam_now().strftime('%Y%m%d_%H%M%S')}.csv"
    byte_stream = io.BytesIO(output.getvalue().encode('utf-8-sig'))

    return byte_stream, filename
