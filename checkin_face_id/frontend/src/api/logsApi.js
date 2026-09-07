import { request } from './client';

export const logsApi = {
  // Lấy danh sách log điểm danh
  getLogs: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.date) query.append('date', params.date);
    if (params.limit) query.append('limit', params.limit);
    return request(`/logs?${query.toString()}`);
  },

  // Xóa log
  deleteLog: (id) => 
    request(`/logs/${id}`, { method: 'DELETE' })
};
