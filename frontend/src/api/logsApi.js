import { request } from './client';

export const logsApi = {
  // Lấy danh sách log điểm danh kết hợp lọc
  getLogs: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.date) query.append('date', params.date);
    if (params.attendance_filter) query.append('attendance_filter', params.attendance_filter);
    if (params.limit) query.append('limit', params.limit);
    return request(`/logs?${query.toString()}`);
  },

  // HR/Admin cập nhật trạng thái xin phép
  updatePermission: (id, payload) =>
    request(`/logs/${id}/permission`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),

  // Xóa log
  deleteLog: (id) => 
    request(`/logs/${id}`, { method: 'DELETE' })
};
