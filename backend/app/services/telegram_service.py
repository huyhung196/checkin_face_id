import os
import io
import json
import logging
import urllib.request
import urllib.parse
import urllib.error
from typing import List, Optional, Dict, Any

from app.config import PROJECT_ROOT, BASE_DIR

logger = logging.getLogger("telegram_service")

def get_telegram_config() -> Dict[str, Any]:
    """Lấy cấu hình Telegram Bot từ biến môi trường"""
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    raw_chats = os.getenv("ADMIN_CHAT_ID", "") or os.getenv("TELEGRAM_ADMIN_CHAT_ID", "")
    
    chat_ids = []
    if raw_chats:
        for cid in raw_chats.replace(";", ",").split(","):
            c = cid.strip()
            if c:
                chat_ids.append(c)
                
    return {
        "bot_token": token,
        "chat_ids": chat_ids,
        "is_configured": bool(token and chat_ids)
    }


def send_telegram_message(text: str, parse_mode: str = "HTML") -> Dict[str, Any]:
    """Gửi tin nhắn văn bản đến tất cả admin chat IDs"""
    cfg = get_telegram_config()
    if not cfg["is_configured"]:
        return {"success": False, "message": "Telegram Bot chưa được cấu hình"}

    token = cfg["bot_token"]
    results = []
    
    for cid in cfg["chat_ids"]:
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = urllib.parse.urlencode({
            "chat_id": cid,
            "text": text,
            "parse_mode": parse_mode
        }).encode("utf-8")
        
        req = urllib.request.Request(url, data=payload)
        try:
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode())
                results.append({"chat_id": cid, "ok": data.get("ok", False)})
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="ignore")
            logger.warning(f"Lỗi gửi Telegram tới {cid}: {e.code} - {err_body}")
            results.append({"chat_id": cid, "ok": False, "error": err_body})
        except Exception as e:
            logger.warning(f"Lỗi kết nối Telegram: {e}")
            results.append({"chat_id": cid, "ok": False, "error": str(e)})

    has_success = any(r.get("ok") for r in results)
    return {"success": has_success, "details": results}


def send_telegram_photo(photo_path: str, caption: str = "") -> Dict[str, Any]:
    """Gửi ảnh chụp kèm ghi chú đến admin chat IDs"""
    cfg = get_telegram_config()
    if not cfg["is_configured"]:
        return {"success": False, "message": "Telegram Bot chưa được cấu hình"}

    # Tìm file ảnh thực tế trên ổ cứng
    real_path = None
    if photo_path.startswith("/uploads/"):
        real_path = os.path.join(BASE_DIR, photo_path.lstrip("/"))
    elif os.path.exists(photo_path):
        real_path = photo_path
    elif os.path.exists(os.path.join(BASE_DIR, "uploads", os.path.basename(photo_path))):
        real_path = os.path.join(BASE_DIR, "uploads", os.path.basename(photo_path))

    if not real_path or not os.path.exists(real_path):
        # Không có file ảnh, gửi tin nhắn văn bản thay thế
        return send_telegram_message(caption)

    token = cfg["bot_token"]
    results = []

    try:
        with open(real_path, "rb") as f:
            photo_bytes = f.read()
    except Exception as e:
        return send_telegram_message(caption)

    for cid in cfg["chat_ids"]:
        boundary = "----WebKitFormBoundaryTelegramMebieco7MA4YWxkTrZu0gW"
        body = io.BytesIO()

        # chat_id
        body.write(f"--{boundary}\r\n".encode("utf-8"))
        body.write(f'Content-Disposition: form-data; name="chat_id"\r\n\r\n{cid}\r\n'.encode("utf-8"))

        # caption
        if caption:
            body.write(f"--{boundary}\r\n".encode("utf-8"))
            body.write('Content-Disposition: form-data; name="caption"\r\n\r\n'.encode("utf-8"))
            body.write(caption.encode("utf-8"))
            body.write("\r\n".encode("utf-8"))

            body.write(f"--{boundary}\r\n".encode("utf-8"))
            body.write('Content-Disposition: form-data; name="parse_mode"\r\n\r\nHTML\r\n'.encode("utf-8"))

        # photo file
        filename = os.path.basename(real_path)
        body.write(f"--{boundary}\r\n".encode("utf-8"))
        body.write(f'Content-Disposition: form-data; name="photo"; filename="{filename}"\r\n'.encode("utf-8"))
        body.write("Content-Type: image/jpeg\r\n\r\n".encode("utf-8"))
        body.write(photo_bytes)
        body.write("\r\n".encode("utf-8"))

        body.write(f"--{boundary}--\r\n".encode("utf-8"))
        payload = body.getvalue()

        url = f"https://api.telegram.org/bot{token}/sendPhoto"
        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
        )

        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                data = json.loads(resp.read().decode())
                results.append({"chat_id": cid, "ok": data.get("ok", False)})
        except Exception as e:
            logger.warning(f"Lỗi gửi ảnh Telegram tới {cid}: {e}")
            results.append({"chat_id": cid, "ok": False, "error": str(e)})

    has_success = any(r.get("ok") for r in results)
    return {"success": has_success, "details": results}


def notify_checkin_event(log_data: Dict[str, Any]):
    """
    Gửi thông báo Telegram khi có sự kiện chấm công đặc biệt:
    - Người lạ quét mặt (Cảnh báo an ninh)
    - Điểm danh ngoài vùng GPS (Cảnh báo vi phạm)
    - Đi trễ / Về sớm có phép hoặc không phép
    """
    try:
        user_name = log_data.get("user_name", "Không rõ")
        emp_code = log_data.get("employee_code", "")
        check_type = log_data.get("check_type", "Điểm danh")
        att_status = log_data.get("attendance_status", "Đúng Giờ")
        formatted_time = log_data.get("formatted_time", "")
        photo_path = log_data.get("photo_path", "")
        gps_status = log_data.get("gps_status", "")
        late_min = log_data.get("late_minutes", 0)
        early_min = log_data.get("early_minutes", 0)
        device_info = log_data.get("device_info", "")

        is_unknown = (user_name == "Khách / Nhân viên" or not emp_code)
        is_gps_violation = (log_data.get("gps_matched") == 0)

        # 1. CẢNH BÁO AN NINH: Người lạ
        if is_unknown:
            caption = (
                "🚨 <b>[CẢNH BÁO AN NINH MEBIECO]</b>\n"
                "Phát hiện <b>NGƯỜI LẠ</b> vừa quét mặt tại cửa!\n"
                f"⏱️ <b>Thời gian:</b> {formatted_time}\n"
                f"📱 <b>Thiết bị:</b> {device_info}\n"
                "<i>Hệ thống đã từ chối điểm danh cho trường hợp này.</i>"
            )
            send_telegram_photo(photo_path, caption)
            return

        # 2. CẢNH BÁO GPS VI PHẠM
        if is_gps_violation:
            dist = log_data.get("gps_distance", 0)
            radius = log_data.get("gps_radius", 100)
            caption = (
                "⚠️ <b>[CẢNH BÁO GPS MEBIECO]</b>\n"
                f"Nhân viên <b>{user_name}</b> ({emp_code}) điểm danh <b>NGOÀI VÙNG CHO PHÉP</b>!\n"
                f"📍 <b>Khoảng cách:</b> {dist}m (Bán kính quy định: {radius}m)\n"
                f"⏱️ <b>Thời gian:</b> {formatted_time}\n"
                f"Loại: {check_type}"
            )
            send_telegram_photo(photo_path, caption)
            return

        # 3. THÔNG BÁO ĐI TRỄ / VỀ SỚM
        if att_status == "Đi Trễ":
            text = (
                f"🟠 <b>[THÔNG BÁO VÀO CA - ĐI TRỄ]</b>\n"
                f"Nhân viên: <b>{user_name}</b> ({emp_code})\n"
                f"Trễ: <b>{late_min} phút</b>\n"
                f"Thời gian: {formatted_time}"
            )
            send_telegram_message(text)
        elif att_status == "Về Sớm":
            text = (
                f"🟠 <b>[THÔNG BÁO TAN CA - VỀ SỚM]</b>\n"
                f"Nhân viên: <b>{user_name}</b> ({emp_code})\n"
                f"Sớm: <b>{early_min} phút</b> (Đã làm: {log_data.get('working_duration', '---')})\n"
                f"Thời gian: {formatted_time}"
            )
            send_telegram_message(text)
        elif check_type == "Tan Ca":
            # Tan ca đúng giờ
            text = (
                f"🔴 <b>[THÔNG BÁO TAN CA]</b>\n"
                f"Nhân viên: <b>{user_name}</b> ({emp_code})\n"
                f"Thời gian làm việc: <b>{log_data.get('working_duration', '---')}</b>\n"
                f"Giờ ra: {formatted_time}"
            )
            send_telegram_message(text)
    except Exception as e:
        logger.warning(f"Lỗi khi gửi thông báo sự kiện Telegram: {e}")
