from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.services.export_service import generate_attendance_csv

router = APIRouter(prefix="/api/export", tags=["Export"])

@router.get("")
def export_csv(date: str = "", attendance_filter: str = ""):
    """Xuất nhật ký điểm danh ra file CSV với UTF-8 BOM chuẩn cho Excel tiếng Việt kết hợp lọc theo ngày và trạng thái"""
    byte_stream, filename = generate_attendance_csv(date_filter=date, attendance_filter=attendance_filter)
    return StreamingResponse(
        byte_stream,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
