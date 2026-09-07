import { request } from './client';

export const systemApi = {
  getMyIp: () => request('/my-ip'),
  getHealth: () => request('/health'),
  getExportUrl: (date = '') => date ? `/api/export?date=${encodeURIComponent(date)}` : '/api/export'
};
