import { request } from './client';

export const systemApi = {
  getMyIp: () => request('/my-ip'),
  getHealth: () => request('/health'),
  getExportUrl: (date = '', attendanceFilter = '') => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (attendanceFilter && attendanceFilter !== 'all') params.append('attendance_filter', attendanceFilter);
    const qs = params.toString();
    return qs ? `/api/export?${qs}` : '/api/export';
  }
};
