import { request } from './client';

export const employeeApi = {
  // Lấy danh sách nhân viên
  getAll: () => request('/employees'),

  // Lấy mã nhân viên tự động kế tiếp
  getNextCode: () => request('/employees/next-code'),

  // Xem chi tiết nhân viên
  getById: (id) => request(`/employees/${id}`),

  // Kiểm tra trùng khuôn mặt trước khi tạo
  checkDuplicate: (descriptors) => 
    request('/employees/check-duplicate', {
      method: 'POST',
      body: JSON.stringify({ face_descriptors: descriptors })
    }),

  // Tạo nhân viên mới (kèm cờ force_create nếu cố ý tạo khi trùng)
  create: (data) => 
    request('/employees', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Bổ sung thêm vector góc mặt cho nhân viên đã có
  appendDescriptors: (empId, descriptors, avatarImage = null) =>
    request(`/employees/${empId}/append-descriptors`, {
      method: 'POST',
      body: JSON.stringify({
        face_descriptors: descriptors,
        avatar_image: avatarImage
      })
    }),

  // Xóa nhân viên
  delete: (id) => 
    request(`/employees/${id}`, { method: 'DELETE' })
};
