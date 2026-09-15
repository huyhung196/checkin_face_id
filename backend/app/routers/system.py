from fastapi import APIRouter, Request
from app.config import get_vietnam_now
from app.services.checkin_service import parse_device_info

router = APIRouter(prefix="/api", tags=["System"])

@router.get("/my-ip")
def get_my_ip(request: Request):
    """Endpoint trả về thông tin thiết bị & thời gian hệ thống"""
    ua = request.headers.get("user-agent", "")
    return {
        "device_info": parse_device_info(ua),
        "server_time": get_vietnam_now().strftime("%H:%M:%S - %d/%m/%Y")
    }


@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Face ID AI Check-in System",
        "time": get_vietnam_now().isoformat()
    }

@router.get("/telegram/status")
def telegram_status():
    from app.services.telegram_service import get_telegram_config
    return {
        "success": True,
        "data": get_telegram_config()
    }

@router.post("/telegram/test")
def telegram_test():
    from app.services.telegram_service import send_telegram_message
    res = send_telegram_message(
        "🔔 <b>[MEBIECO - KIỂM TRA KẾT NỐI]</b>\n"
        "Hệ thống Điểm danh Face ID MEBIECO đã kết nối Telegram Bot thành công!\n"
        "Sẵn sàng nhận thông báo và cảnh báo an ninh."
    )
    return res

