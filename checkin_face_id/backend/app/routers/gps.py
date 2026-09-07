from fastapi import APIRouter, Request, HTTPException
from typing import Dict, Any

from app.models import GpsSettingsRequest, GpsCheckinRequest
from app.services.gps_service import (
    get_gps_settings,
    save_gps_settings,
    reset_gps_settings,
    record_gps_checkin,
    get_gps_logs,
    delete_gps_log
)

router = APIRouter(prefix="/api/gps", tags=["GPS Check-in"])


@router.get("/settings")
async def fetch_gps_settings():
    """Lấy thông tin cấu hình tọa độ GPS mục tiêu và bán kính quy định"""
    settings = get_gps_settings()
    return {
        "success": True,
        "is_configured": bool(settings and settings.get("is_configured")),
        "data": settings
    }


@router.post("/settings")
async def update_gps_settings(data: GpsSettingsRequest):
    """Cập nhật tọa độ mục tiêu (Lat/Lng), bán kính (mét) và tên vị trí quy định"""
    if not data.latitude or not data.longitude:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp tọa độ vĩ độ và kinh độ hợp lệ!")
    if data.radius_meters <= 0:
        raise HTTPException(status_code=400, detail="Bán kính cho phép phải lớn hơn 0 mét!")

    result = save_gps_settings(
        location_name=data.location_name or "Văn Phòng Công Ty",
        latitude=data.latitude,
        longitude=data.longitude,
        radius_meters=data.radius_meters
    )
    return result


@router.delete("/settings")
async def remove_gps_settings():
    """Reset xóa cấu hình GPS mục tiêu (nhật ký log vẫn giữ nguyên)"""
    ok = reset_gps_settings()
    return {"success": ok, "message": "Đã xóa cài đặt GPS mục tiêu"}


@router.post("/checkin")
async def process_gps_checkin(data: GpsCheckinRequest, request: Request):
    """Thực hiện điểm danh GPS: lấy vị trí hiện tại, tính khoảng cách và ghi log"""
    user_agent = request.headers.get("user-agent", "Unknown")

    result = record_gps_checkin(
        user_lat=data.user_lat,
        user_lng=data.user_lng,
        user_name=data.user_name,
        employee_id=data.employee_id,
        employee_code=data.employee_code,
        user_agent=user_agent
    )
    return result


@router.get("/logs")
async def fetch_gps_logs(limit: int = 50):
    """Lấy danh sách nhật ký điểm danh GPS"""
    logs = get_gps_logs(limit=limit)
    return {
        "success": True,
        "logs": logs,
        "total": len(logs)
    }


@router.delete("/logs/{log_id}")
async def remove_gps_log(log_id: int):
    """Xóa 1 bản ghi nhật ký GPS"""
    ok = delete_gps_log(log_id)
    return {"success": ok, "message": f"Đã xóa log GPS #{log_id}"}
