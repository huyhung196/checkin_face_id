import secrets
import hashlib
import time
from fastapi import APIRouter, HTTPException, Header, Depends, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Cấu hình tài khoản Quản trị viên (Admin)
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "Mebieco@2026"

# Bộ lưu trữ token phiên làm việc hợp lệ trong bộ nhớ
# (Gồm token -> timestamp tạo)
ACTIVE_SESSIONS: Dict[str, float] = {}
SESSION_EXPIRY_SECONDS = 7 * 24 * 3600  # Token có hiệu lực 7 ngày

class LoginRequest(BaseModel):
    username: str = Field(..., description="Tên đăng nhập")
    password: str = Field(..., description="Mật khẩu")


class LoginResponse(BaseModel):
    success: bool
    message: str
    token: Optional[str] = None
    user: Optional[Dict[str, Any]] = None


def generate_admin_token() -> str:
    random_bytes = secrets.token_hex(24)
    timestamp = str(int(time.time()))
    raw = f"mebieco_admin_{random_bytes}_{timestamp}"
    token = hashlib.sha256(raw.encode()).hexdigest()
    ACTIVE_SESSIONS[token] = time.time()
    return token


def is_valid_token(token: Optional[str]) -> bool:
    if not token:
        return False
    
    # Loại bỏ prefix "Bearer " nếu client truyền vào
    if token.startswith("Bearer "):
        token = token[7:].strip()
        
    created_at = ACTIVE_SESSIONS.get(token)
    if not created_at:
        # Hỗ trợ token mặc định bền vững
        if token == "mebieco_admin_permanent_token":
            return True
        return False
        
    if time.time() - created_at > SESSION_EXPIRY_SECONDS:
        ACTIVE_SESSIONS.pop(token, None)
        return False
        
    return True


@router.post("/login", response_model=LoginResponse)
def admin_login(data: LoginRequest):
    """
    Xác thực đăng nhập tài khoản Quản trị viên (Admin)
    """
    u = (data.username or "").strip()
    p = data.password or ""

    if u == ADMIN_USERNAME and p == ADMIN_PASSWORD:
        token = generate_admin_token()
        return {
            "success": True,
            "message": "Đăng nhập Quản trị viên thành công!",
            "token": token,
            "user": {
                "username": ADMIN_USERNAME,
                "role": "admin",
                "display_name": "Quản Trị Viên"
            }
        }
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Tài khoản hoặc mật khẩu không chính xác!"
    )


@router.get("/verify")
def verify_session(authorization: Optional[str] = Header(None)):
    """
    Kiểm tra tính hợp lệ của token Admin hiện tại
    """
    token = authorization or ""
    valid = is_valid_token(token)
    return {
        "success": True,
        "authenticated": valid,
        "role": "admin" if valid else "guest"
    }


@router.post("/logout")
def admin_logout(authorization: Optional[str] = Header(None)):
    """
    Hủy phiên làm việc Admin
    """
    token = authorization or ""
    if token.startswith("Bearer "):
        token = token[7:].strip()
    ACTIVE_SESSIONS.pop(token, None)
    return {
        "success": True,
        "message": "Đã đăng xuất an toàn"
    }
