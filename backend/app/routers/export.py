from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.services.export_service import generate_attendance_csv

router = APIRouter(prefix="/api/export", tags=["Export"])

@router.get("")
def export_csv():
    """Xuất toàn bộ nhật ký điểm danh ra file CSV với UTF-8 BOM chuẩn cho Excel tiếng Việt"""
    byte_stream, filename = generate_attendance_csv()
    return StreamingResponse(
        byte_stream,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
