/**
 * Quản lý hàng đợi điểm danh ngoại tuyến (Offline Queue Storage & Auto-Sync)
 * Khi rớt mạng Internet, lưu tạm các lượt điểm danh vào localStorage/IndexedDB.
 * Khi có mạng trở lại, tự động đẩy (sync) lên máy chủ.
 */

const OFFLINE_KEY = 'mebieco_offline_pending_checkins';

export const offlineStorage = {
  // Lấy danh sách lượt quét đang chờ đồng bộ
  getPending: () => {
    try {
      const raw = localStorage.getItem(OFFLINE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  // Thêm một lượt quét vào hàng đợi ngoại tuyến
  savePending: (payload) => {
    const list = offlineStorage.getPending();
    const item = {
      offline_id: `off_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      payload: payload,
      user_name: payload.user_name || 'Nhân viên',
      employee_code: payload.employee_code || '',
      created_at: new Date().toISOString(),
      formatted_time: new Date().toLocaleTimeString('vi-VN') + ' - ' + new Date().toLocaleDateString('vi-VN')
    };
    list.push(item);
    try {
      localStorage.setItem(OFFLINE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('LocalStorage đầy hoặc không khả dụng:', e);
    }
    return item;
  },

  // Xóa một lượt quét đã đồng bộ thành công
  removePending: (offlineId) => {
    const list = offlineStorage.getPending().filter(x => x.offline_id !== offlineId);
    try {
      localStorage.setItem(OFFLINE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }
  },

  // Xóa toàn bộ hàng đợi
  clearPending: () => {
    try {
      localStorage.removeItem(OFFLINE_KEY);
    } catch (e) {
      console.error(e);
    }
  },

  // Số lượng đang chờ đồng bộ
  count: () => {
    return offlineStorage.getPending().length;
  }
};
