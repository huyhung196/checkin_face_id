from fastapi import APIRouter, Request, HTTPException
from typing import Dict, Any

from app.models import CheckinRequest
from app.services.checkin_service import record_checkin

router = APIRouter(prefix="/api/checkin", tags=["Check-in"])

def extract_client_ip(request: Request) -> str:
    """Trích xuất địa chỉ IP chính xác từ headers (Cloudflare, Proxy, hoặc Direct)"""
    headers = request.headers
    ip_candidates = [
        headers.get("cf-connecting-ip"),
        headers.get("x-real-ip"),
        headers.get("x-forwarded-for"),
        headers.get("x-client-ip"),
        headers.get("x-cluster-client-ip")
    ]
    for candidate in ip_candidates:
        if candidate:
            ips = [ip.strip() for ip in candidate.split(",") if ip.strip()]
            if ips:
                return ips[0]
                
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


@router.post("")
async def process_checkin(data: CheckinRequest, request: Request):
    """
    Tiếp nhận ảnh chụp, nhận diện khuôn mặt đa góc AI, lấy IP Public & LAN và ghi log
    """
    if not data.image:
        raise HTTPException(status_code=400, detail="Thiếu dữ liệu hình ảnh (image payload is required)")

    local_ip = extract_client_ip(request)
    public_ip = data.public_ip.strip() if data.public_ip else local_ip
    user_agent = request.headers.get("user-agent", "Unknown")

    result = record_checkin(
        image_base64=data.image,
        public_ip=public_ip,
        local_ip=local_ip,
        user_name=data.user_name,
        employee_id=data.employee_id,
        employee_code=data.employee_code,
        match_confidence=data.match_confidence,
        face_descriptors=data.face_descriptors,
        face_descriptor=data.face_descriptor,
        user_agent=user_agent
    )

    return result
