import { request } from './client';

export const systemApi = {
  getMyIp: () => request('/my-ip'),
  getHealth: () => request('/health'),
  getExportUrl: () => '/api/export'
};
