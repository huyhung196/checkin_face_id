import { request } from './client';

const TOKEN_KEY = 'mebieco_admin_token';
const USER_KEY = 'mebieco_admin_user';

export const authApi = {
  // Đăng nhập tài khoản Quản trị viên
  login: async (username, password) => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    if (res.success && res.token) {
      localStorage.setItem(TOKEN_KEY, res.token);
      if (res.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
      }
    }
    return res;
  },

  // Kiểm tra phiên làm việc Admin
  verifySession: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return { authenticated: false };

    try {
      const res = await request('/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.authenticated) {
        authApi.clearSession();
      }
      return res;
    } catch {
      return { authenticated: false };
    }
  },

  // Đăng xuất Admin
  logout: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    try {
      if (token) {
        await request('/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    } catch {
      // Bỏ qua lỗi mạng khi logout
    } finally {
      authApi.clearSession();
    }
  },

  clearSession: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getToken: () => localStorage.getItem(TOKEN_KEY),
  getUser: () => {
    try {
      const u = localStorage.getItem(USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },
  isAuthenticated: () => !!localStorage.getItem(TOKEN_KEY)
};
