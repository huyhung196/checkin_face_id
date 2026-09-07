from fastapi import APIRouter, Request, HTTPException
from typing import Dict, Any

from app.models import CheckinRequest
from app.services.checkin_service import record_checkin

router = APIRouter(prefix="/api/checkin", tags=["Check-in"])

@router.post("")
async def process_checkin(data: CheckinRequest, request: Request):
    """
    Tiếp nhận ảnh chụp, nhận diện khuôn mặt đa góc AI và ghi log điểm danh
    """
    if not data.image:
        raise HTTPException(status_code=400, detail="Thiếu dữ liệu hình ảnh (image payload is required)")

    user_agent = request.headers.get("user-agent", "Unknown")

    result = record_checkin(
        image_base64=data.image,
        user_name=data.user_name,
        employee_id=data.employee_id,
        employee_code=data.employee_code,
        match_confidence=data.match_confidence,
        face_descriptors=data.face_descriptors,
        face_descriptor=data.face_descriptor,
        user_agent=user_agent,
        user_lat=data.user_lat,
        user_lng=data.user_lng
    )

    return result
