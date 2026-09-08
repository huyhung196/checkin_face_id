from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.models import ShiftSettingsRequest
from app.services.shift_service import get_shift_settings, save_shift_settings

router = APIRouter(prefix="/api/shift-settings", tags=["Shift Settings"])

@router.get("")
def fetch_shift_settings():
    """Lấy cấu hình ca làm việc hiện tại"""
    settings = get_shift_settings()
    return {
        "success": True,
        "data": settings
    }

@router.post("")
def update_shift_settings(payload: ShiftSettingsRequest):
    """Cập nhật cấu hình ca làm việc"""
    try:
        res = save_shift_settings(
            shift_name=payload.shift_name,
            start_time=payload.start_time,
            end_time=payload.end_time,
            grace_period_minutes=payload.grace_period_minutes or 0,
            early_leave_buffer_minutes=payload.early_leave_buffer_minutes or 0
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi khi lưu cài đặt ca làm việc: {str(e)}")
