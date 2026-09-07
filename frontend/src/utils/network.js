// Tiện ích lấy địa chỉ IP Public (WAN) của người dùng

let cachedPublicIp = null;

export async function fetchPublicIP() {
  if (cachedPublicIp) return cachedPublicIp;

  const services = [
    'https://api.ipify.org?format=json',
    'https://api64.ipify.org?format=json',
    'https://ifconfig.co/json',
    'https://ipapi.co/json/'
  ];

  for (const url of services) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const ip = data.ip || data.ip_address || data.query;
        if (ip && ip.length >= 7) {
          cachedPublicIp = ip;
          return ip;
        }
      }
    } catch (e) {
      // Continue next service
    }
  }

  // Fallback nếu không có mạng ngoài
  return '127.0.0.1 (Localhost)';
}
