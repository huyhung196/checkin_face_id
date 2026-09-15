from typing import Optional
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.services.export_service import generate_attendance_csv
from app.services.monthly_report_service import generate_monthly_attendance_excel, get_monthly_attendance_data

router = APIRouter(prefix="/api/export", tags=["Export"])

@router.get("")
def export_csv(date: str = "", attendance_filter: str = ""):
    """Xuất nhật ký điểm danh thô ra file CSV với UTF-8 BOM chuẩn cho Excel tiếng Việt"""
    byte_stream, filename = generate_attendance_csv(date_filter=date, attendance_filter=attendance_filter)
    return StreamingResponse(
        byte_stream,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/monthly-report")
def export_monthly_report(
    month: str = "",
    from_date: str = "",
    to_date: str = "",
    employee_id: Optional[int] = None
):
    """
    Xuất file Excel (.xlsx) Báo Cáo Chấm Công Tháng HR thông minh:
    - Tự động gộp Check In - Check Out của 1 nhân viên thành 1 hàng
    - Định dạng theo mẫu chuẩn report_example.xlsx (Merge tên nhân viên, zebra stripes, header xanh #1155CC)
    - Kèm Sheet 2: Bảng Tổng Hợp Công HR
    """
    byte_stream, filename = generate_monthly_attendance_excel(
        year_month=month,
        from_date=from_date,
        to_date=to_date,
        employee_id=employee_id
    )
    return StreamingResponse(
        byte_stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/monthly-data")
def get_monthly_preview_data(
    month: str = "",
    from_date: str = "",
    to_date: str = "",
    employee_id: Optional[int] = None
):
    """Lấy dữ liệu chấm công tháng đã gộp Check In - Check Out để xem trước trên giao diện"""
    data = get_monthly_attendance_data(
        year_month=month,
        from_date=from_date,
        to_date=to_date,
        employee_id=employee_id
    )
    return {
        "success": True,
        "data": data
    }

