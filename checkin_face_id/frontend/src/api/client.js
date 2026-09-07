// API Client Wrapper

const BASE_URL = '/api';

export async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  try {
    const res = await fetch(url, { ...options, headers });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = json.detail || json.message || `Lỗi máy chủ (${res.status})`;
      const err = new Error(errorMsg);
      err.status = res.status;
      err.data = json;
      throw err;
    }

    return json;
  } catch (err) {
    if (!err.status) {
      console.error(`Network error at ${url}:`, err);
    }
    throw err;
  }
}
