import { useState, useEffect } from 'react';
import { fetchPublicIP } from '../utils/network';
import { systemApi } from '../api/systemApi';

export function usePublicIp() {
  const [publicIp, setPublicIp] = useState('');
  const [localIp, setLocalIp] = useState('127.0.0.1');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initIps() {
      setIsLoading(true);
      try {
        const wan = await fetchPublicIP();
        setPublicIp(wan);

        const localRes = await systemApi.getMyIp().catch(() => ({ local_ip: '127.0.0.1' }));
        if (localRes && localRes.local_ip) {
          setLocalIp(localRes.local_ip);
        }
      } catch (err) {
        console.warn("Lỗi khi lấy IP:", err);
      } finally {
        setIsLoading(false);
      }
    }
    initIps();
  }, []);

  return { publicIp, localIp, isLoading };
}
