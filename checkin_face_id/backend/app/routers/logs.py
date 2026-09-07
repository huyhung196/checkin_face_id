from fastapi import APIRouter, Query
from datetime import datetime
from app.services.checkin_service import get_checkin_logs, delete_checkin_log

router = APIRouter(prefix="/api/logs", tags=["Logs"])

@router.get("")
def fetch_logs(
    limit: int = Query(50, ge=1, le=200),
    search: str = Query("", description="Tìm theo tên, mã NV hoặc IP"),
    date: str = Query("", description="Lọc theo ngày YYYY-MM-DD")
):
    """Lấy danh sách nhật ký điểm danh"""
    result = get_checkin_logs(limit=limit, search=search, date_filter=date)
    return {
        "success": True,
        "data": result["logs"],
        "today_count": result["today_count"],
        "total_count": result["total_count"],
        "total_employees": result["total_employees"],
        "server_time": datetime.now().strftime("%H:%M:%S - %d/%m/%Y")
    }


@router.delete("/{log_id}")
def remove_log(log_id: int):
    """Xóa một bản ghi log và file ảnh tương ứng"""
    success = delete_checkin_log(log_id)
    return {"success": success, "message": f"Đã xóa thành công log #{log_id}"}
