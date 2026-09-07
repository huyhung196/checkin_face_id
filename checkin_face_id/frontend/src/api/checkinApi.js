import { request } from './client';

export const checkinApi = {
  // Gửi điểm danh Face ID kèm ảnh và IP
  submit: (payload) => 
    request('/checkin', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
};
