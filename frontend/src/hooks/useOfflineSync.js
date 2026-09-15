import { useState, useEffect, useCallback } from 'react';
import { offlineStorage } from '../utils/offlineStorage';
import { checkinApi } from '../api/checkinApi';

export function useOfflineSync(onSyncSuccess) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(offlineStorage.count());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);

  // Cập nhật số lượng lượt chờ
  const refreshPendingCount = useCallback(() => {
    setPendingCount(offlineStorage.count());
  }, []);

  // Tiến hành đồng bộ toàn bộ hàng đợi ngoại tuyến lên server
  const syncNow = useCallback(async () => {
    const list = offlineStorage.getPending();
    if (list.length === 0 || isSyncing) return;

    setIsSyncing(true);
    let successCount = 0;

    for (const item of list) {
      try {
        const res = await checkinApi.submit(item.payload);
        if (res && res.success) {
          offlineStorage.removePending(item.offline_id);
          successCount++;
        }
      } catch (err) {
        console.warn('Đồng bộ thất bại cho lượt quét:', item, err);
        // Dừng đồng bộ nếu mạng vẫn chưa sẵn sàng
        break;
      }
    }

    refreshPendingCount();
    setIsSyncing(false);

    if (successCount > 0) {
      setSyncMessage(`Đã đồng bộ ${successCount} lượt chấm công ngoại tuyến lên máy chủ!`);
      setTimeout(() => setSyncMessage(null), 5000);
      if (onSyncSuccess) {
        onSyncSuccess(successCount);
      }
    }
  }, [isSyncing, onSyncSuccess, refreshPendingCount]);

  // Lắng nghe sự kiện Online / Offline
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Tự động đồng bộ khi có mạng trở lại
      setTimeout(() => {
        syncNow();
      }, 1500);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncNow]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    syncMessage,
    refreshPendingCount,
    syncNow
  };
}
