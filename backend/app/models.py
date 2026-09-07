from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field

# ==================== EMPLOYEE SCHEMAS ====================

class EmployeeCreateRequest(BaseModel):
    employee_code: str = Field(..., description="Mã nhân viên (VD: NV001)")
    full_name: str = Field(..., description="Họ và tên")
    department: Optional[str] = "Phòng Ban"
    position: Optional[str] = "Nhân viên"
    phone: Optional[str] = ""
    email: Optional[str] = ""
    image: Optional[str] = ""  # Base64 avatar / face photo
    face_descriptors: Optional[List[List[float]]] = None  # Danh sách các vector góc mặt (128 floats mỗi vector)
    face_descriptor: Optional[List[float]] = None        # Tương thích nếu chỉ gửi 1 vector
    force_create: Optional[bool] = False                 # Bỏ qua cảnh báo trùng mặt nếu cố ý tạo


class CheckDuplicateRequest(BaseModel):
    face_descriptor: Optional[List[float]] = None
    face_descriptors: Optional[List[List[float]]] = None
    exclude_employee_id: Optional[int] = None


class AppendDescriptorsRequest(BaseModel):
    face_descriptors: List[List[float]]
    avatar_image: Optional[str] = None


# ==================== CHECK-IN SCHEMAS ====================

class CheckinRequest(BaseModel):
    image: str = Field(..., description="Ảnh chụp khuôn mặt Base64")
    public_ip: Optional[str] = ""
    user_name: Optional[str] = ""
    employee_id: Optional[int] = None
    employee_code: Optional[str] = ""
    match_confidence: Optional[float] = 0.0
    face_descriptor: Optional[List[float]] = None
    face_descriptors: Optional[List[List[float]]] = None
