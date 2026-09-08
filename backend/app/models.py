from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field

# ==================== EMPLOYEE SCHEMAS ====================

class EmployeeCreateRequest(BaseModel):
    employee_code: Optional[str] = Field(None, description="Mã nhân viên (Hệ thống tự động cấp nếu để trống)")
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
    user_name: Optional[str] = ""
    employee_id: Optional[int] = None
    employee_code: Optional[str] = ""
    match_confidence: Optional[float] = 0.0
    face_descriptors: Optional[List[List[float]]] = None
    face_descriptor: Optional[List[float]] = None
    user_lat: Optional[float] = None
    user_lng: Optional[float] = None

# ==================== GPS SCHEMAS ====================

class GpsSettingsRequest(BaseModel):
    location_name: Optional[str] = "Văn Phòng Công Ty"
    latitude: float = Field(..., description="Vĩ độ GPS mục tiêu")
    longitude: float = Field(..., description="Kinh độ GPS mục tiêu")
    radius_meters: float = Field(100.0, description="Bán kính cho phép (mètres)")


class GpsCheckinRequest(BaseModel):
    user_lat: float = Field(..., description="Vĩ độ thiết bị hiện tại")
    user_lng: float = Field(..., description="Kinh độ thiết bị hiện tại")
    user_name: Optional[str] = "Người dùng"
    employee_id: Optional[int] = None
    employee_code: Optional[str] = ""


# ==================== SHIFT & ATTENDANCE SCHEMAS ====================

class ShiftSettingsRequest(BaseModel):
    shift_name: Optional[str] = "Ca Hành Chính Mebieco"
    start_time: str = Field("08:00", description="Giờ bắt đầu ca chuẩn (HH:MM)")
    end_time: str = Field("17:30", description="Giờ kết thúc ca chuẩn (HH:MM)")
    grace_period_minutes: Optional[int] = Field(15, description="Số phút ân hạn cho phép trễ")
    early_leave_buffer_minutes: Optional[int] = Field(0, description="Số phút cho phép về sớm")


class PermissionUpdateRequest(BaseModel):
    has_permission: bool = Field(..., description="Đã có xin phép hay chưa")
    permission_note: Optional[str] = Field("", description="Ghi chú lý do xin phép")
    updated_by: Optional[str] = Field("Admin", description="Người phê duyệt (HR/Admin)")

