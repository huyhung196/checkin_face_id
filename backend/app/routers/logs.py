from fastapi import APIRouter, Query, HTTPException
from datetime import datetime
from app.models import PermissionUpdateRequest
from app.services.checkin_service import get_checkin_logs, delete_checkin_log, update_log_permission

router = APIRouter(prefix="/api/logs", tags=["Logs"])

@router.get("")
def fetch_logs(
    limit: int = Query(50, ge=1, le=200),
    search: str = Query("", description="Tìm theo tên, mã NV hoặc IP"),
    date: str = Query("", description="Lọc theo ngày YYYY-MM-DD"),
    attendance_filter: str = Query("", description="Lọc theo trạng thái chấm công (late, early, unexcused, excused)")
):
    """Lấy danh sách nhật ký điểm danh kết hợp lọc đa chiều"""
    result = get_checkin_logs(
        limit=limit, 
        search=search, 
        date_filter=date, 
        attendance_filter=attendance_filter
    )
    return {
        "success": True,
        "data": result["logs"],
        "today_count": result["today_count"],
        "today_checkin_count": result.get("today_checkin_count", 0),
        "today_checkout_count": result.get("today_checkout_count", 0),
        "total_checkin_count": result.get("total_checkin_count", 0),
        "total_checkout_count": result.get("total_checkout_count", 0),
        "late_count": result.get("late_count", 0),
        "early_count": result.get("early_count", 0),
        "unexcused_count": result.get("unexcused_count", 0),
        "total_count": result["total_count"],
        "total_employees": result["total_employees"],
        "server_time": datetime.now().strftime("%H:%M:%S - %d/%m/%Y")
    }


@router.patch("/{log_id}/permission")
def set_log_permission(log_id: int, payload: PermissionUpdateRequest):
    """HR/Admin đánh dấu đã xin phép hoặc hủy xin phép cho lượt điểm danh"""
    success = update_log_permission(
        log_id=log_id,
        has_permission=payload.has_permission,
        permission_note=payload.permission_note or "",
        updated_by=payload.updated_by or "Admin"
    )
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi điểm danh tương ứng")

    status_text = "Đã đánh dấu có xin phép" if payload.has_permission else "Đã hủy đánh dấu xin phép"
    return {
        "success": True,
        "message": f"{status_text} cho lượt điểm danh #{log_id}",
        "data": {
            "log_id": log_id,
            "has_permission": 1 if payload.has_permission else 0,
            "permission_note": payload.permission_note or "",
            "permission_updated_by": payload.updated_by or "Admin"
        }
    }


@router.delete("/{log_id}")
def remove_log(log_id: int):
    """Xóa một bản ghi log và file ảnh tương ứng"""
    success = delete_checkin_log(log_id)
    return {"success": success, "message": f"Đã xóa thành công log #{log_id}"}
