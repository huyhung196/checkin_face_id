from fastapi import APIRouter, Request
from datetime import datetime
from app.routers.checkin import extract_client_ip
from app.services.checkin_service import parse_device_info

router = APIRouter(prefix="/api", tags=["System"])

@router.get("/my-ip")
def get_my_ip(request: Request):
    """Endpoint trả về IP của Client"""
    local_ip = extract_client_ip(request)
    ua = request.headers.get("user-agent", "")
    return {
        "local_ip": local_ip,
        "device_info": parse_device_info(ua),
        "server_time": datetime.now().strftime("%H:%M:%S - %d/%m/%Y")
    }


@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Face ID AI Check-in System",
        "time": datetime.now().isoformat()
    }
