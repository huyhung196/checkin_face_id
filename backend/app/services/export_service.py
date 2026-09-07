import csv
import io
from datetime import datetime
from typing import List, Dict, Any
from app.services.checkin_service import get_checkin_logs

def generate_attendance_csv() -> tuple[io.BytesIO, str]:
    """Tạo file CSV UTF-8 BOM chuẩn tiếng Việt cho Excel"""
    result = get_checkin_logs(limit=10000)
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
        "Thời Lượng Làm Việc",
        "Độ Khớp AI (%)", 
        "Khớp GPS", 
        "Trạng Thái", 
        "Thiết Bị & Trình Duyệt", 
        "Đường Dẫn Ảnh"
    ])

    for row in logs:
        writer.writerow([
            row["id"],
            row["formatted_time"],
            row.get("employee_code", "") or "---",
            row["user_name"],
            row.get("check_type", "---") or "---",
            row.get("working_duration", "---") or "---",
            f"{row.get('match_confidence', 0)}%",
            row.get("gps_status", "---"),
            row["status"],
            row["device_info"],
            row["photo_path"]
        ])

    output.seek(0)
    filename = f"face_id_attendance_logs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    byte_stream = io.BytesIO(output.getvalue().encode('utf-8-sig'))

    return byte_stream, filename
