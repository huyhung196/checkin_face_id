import { request } from './client';

export const gpsApi = {
  // Lấy cài đặt GPS
  getSettings: () => request('/gps/settings'),

  // Cập nhật cài đặt GPS
  saveSettings: (data) => request('/gps/settings', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Reset xóa cài đặt GPS mục tiêu
  resetSettings: () => request('/gps/settings', { method: 'DELETE' }),

  // Thực hiện điểm danh GPS
  submitCheckin: (data) => request('/gps/checkin', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Lấy nhật ký điểm danh GPS
  getLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/gps/logs${query ? `?${query}` : ''}`);
  },

  // Xóa log GPS
  deleteLog: (id) => request(`/gps/logs/${id}`, { method: 'DELETE' })
};
