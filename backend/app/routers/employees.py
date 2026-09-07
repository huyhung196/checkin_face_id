from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any, List

from app.models import EmployeeCreateRequest, CheckDuplicateRequest, AppendDescriptorsRequest
from app.services.employee_service import (
    get_all_employees,
    get_employee_by_id,
    create_employee,
    append_employee_descriptors,
    delete_employee
)
from app.services.face_service import check_for_duplicate_face

router = APIRouter(prefix="/api/employees", tags=["Employees"])

@router.get("")
def list_employees():
    """Lấy danh sách toàn bộ nhân viên và trạng thái khuôn mặt"""
    employees = get_all_employees()
    return {
        "success": True,
        "total": len(employees),
        "data": employees
    }


@router.get("/{emp_id}")
def get_employee(emp_id: int):
    """Xem chi tiết một nhân viên"""
    emp = get_employee_by_id(emp_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên")
    return {"success": True, "data": emp}


@router.post("/check-duplicate")
def check_duplicate(payload: CheckDuplicateRequest):
    """
    Kiểm tra nhanh xem vector khuôn mặt có trùng với nhân viên nào đã có hay không
    """
    candidate_descriptors = []
    if payload.face_descriptors:
        candidate_descriptors.extend([d for d in payload.face_descriptors if len(d) == 128])
    if payload.face_descriptor and len(payload.face_descriptor) == 128:
        candidate_descriptors.append(payload.face_descriptor)

    if not candidate_descriptors:
        return {"is_duplicate": False, "existing_employee": None}

    all_employees = get_all_employees()
    result = check_for_duplicate_face(
        candidate_descriptors=candidate_descriptors,
        all_employees=all_employees,
        exclude_employee_id=payload.exclude_employee_id
    )
    return {"success": True, **result}


@router.post("")
def create_new_employee(data: EmployeeCreateRequest):
    """
    Đăng ký nhân viên mới (kèm kiểm tra trùng mặt và hỗ trợ chụp đa góc)
    """
    if not data.employee_code or not data.full_name:
        raise HTTPException(status_code=400, detail="Mã nhân viên và Họ tên là bắt buộc")

    res = create_employee(
        employee_code=data.employee_code,
        full_name=data.full_name,
        department=data.department or "Phòng Ban",
        position=data.position or "Nhân viên",
        phone=data.phone or "",
        email=data.email or "",
        avatar_image=data.image or "",
        face_descriptors=data.face_descriptors,
        face_descriptor=data.face_descriptor,
        force_create=data.force_create or False
    )

    if res.get("is_duplicate"):
        # Trả về mã 409 Conflict kèm thông tin nhân viên bị trùng để frontend mở modal xác nhận
        return {
            "success": False,
            "is_duplicate": True,
            "duplicate_info": res["duplicate_info"],
            "message": res["message"]
        }

    return res


@router.post("/{emp_id}/append-descriptors")
def add_more_face_angles(emp_id: int, payload: AppendDescriptorsRequest):
    """
    Bổ sung thêm góc chụp khuôn mặt cho nhân viên đã có
    """
    res = append_employee_descriptors(
        emp_id=emp_id,
        new_descriptors=payload.face_descriptors,
        avatar_image=payload.avatar_image
    )
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("message", "Lỗi cập nhật"))
    return res


@router.delete("/{emp_id}")
def remove_employee(emp_id: int):
    """Xóa nhân viên"""
    success = delete_employee(emp_id)
    return {"success": success, "message": f"Đã xóa nhân viên #{emp_id}"}
