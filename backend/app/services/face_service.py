import math
from typing import List, Optional, Dict, Any
from app.config import FACE_MATCH_THRESHOLD, DUPLICATE_FACE_THRESHOLD

def euclidean_distance(desc1: List[float], desc2: List[float]) -> float:
    """Tính khoảng cách Euclidean L2 giữa 2 vector khuôn mặt 128D"""
    if not desc1 or not desc2 or len(desc1) != len(desc2):
        return 1.0
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(desc1, desc2)))


def calculate_match_against_employee(live_desc: List[float], employee_descriptors: List[List[float]]) -> float:
    """
    Tính khoảng cách nhỏ nhất giữa vector quét trực tiếp với tất cả các góc mặt đã lưu của 1 nhân viên
    (Multi-angle / Multi-shot Best Distance Matching)
    """
    if not employee_descriptors:
        return 1.0
    
    min_dist = float('inf')
    for enrolled_desc in employee_descriptors:
        if enrolled_desc and len(enrolled_desc) == 128:
            dist = euclidean_distance(live_desc, enrolled_desc)
            if dist < min_dist:
                min_dist = dist
                
    return min_dist if min_dist != float('inf') else 1.0


def match_live_face_against_database(
    live_descriptors: List[List[float]],
    all_employees: List[Dict[str, Any]],
    threshold: float = FACE_MATCH_THRESHOLD
) -> Dict[str, Any]:
    """
    So khớp vector khuôn mặt (hoặc nhiều vector) với toàn bộ nhân viên trong hệ thống
    """
    if not live_descriptors or not all_employees:
        return {
            "matched": False,
            "employee": None,
            "distance": 1.0,
            "confidence": 0.0
        }

    best_match = None
    best_distance = float('inf')

    for emp in all_employees:
        emp_descriptors = emp.get("face_descriptors") or []
        if not emp_descriptors:
            continue

        # Thử từng vector quét trực tiếp với tập vector của nhân viên này
        for live_desc in live_descriptors:
            dist = calculate_match_against_employee(live_desc, emp_descriptors)
            if dist < best_distance:
                best_distance = dist
                best_match = emp

    if best_match and best_distance < threshold:
        confidence = max(0.0, min(100.0, round((1.0 - best_distance / 0.6) * 100, 1)))
        if confidence >= 50.0:
            return {
                "matched": True,
                "employee": best_match,
                "distance": round(best_distance, 4),
                "confidence": confidence
            }

    return {
        "matched": False,
        "employee": None,
        "distance": round(best_distance, 4) if best_distance != float('inf') else 1.0,
        "confidence": 0.0
    }


def check_for_duplicate_face(
    candidate_descriptors: List[List[float]],
    all_employees: List[Dict[str, Any]],
    threshold: float = DUPLICATE_FACE_THRESHOLD,
    exclude_employee_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Kiểm tra xem khuôn mặt chuẩn bị thêm có bị trùng với nhân viên nào đã đăng ký trước đó hay không
    """
    if not candidate_descriptors or not all_employees:
        return {"is_duplicate": False, "existing_employee": None, "confidence": 0.0}

    filtered_employees = [e for e in all_employees if e.get("id") != exclude_employee_id]

    match_result = match_live_face_against_database(
        live_descriptors=candidate_descriptors,
        all_employees=filtered_employees,
        threshold=threshold
    )

    if match_result["matched"] and match_result["employee"]:
        emp = match_result["employee"]
        return {
            "is_duplicate": True,
            "existing_employee": {
                "id": emp["id"],
                "employee_code": emp["employee_code"],
                "full_name": emp["full_name"],
                "department": emp["department"],
                "position": emp.get("position", ""),
                "avatar_path": emp.get("avatar_path", ""),
                "sample_count": len(emp.get("face_descriptors") or [])
            },
            "similarity_distance": match_result["distance"],
            "similarity_percent": match_result["confidence"],
            "message": f"Khuôn mặt này trùng {match_result['confidence']}% với nhân viên '{emp['full_name']}' ({emp['employee_code']})"
        }

    return {"is_duplicate": False, "existing_employee": None, "confidence": 0.0}
