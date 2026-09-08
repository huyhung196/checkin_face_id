import { request } from './client';

export const shiftApi = {
  getSettings: () => request('/shift-settings'),
  saveSettings: (payload) => request('/shift-settings', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
};
