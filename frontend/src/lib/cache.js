const CACHE_VERSION = 'v2';

export const getCache = (key) => {
  try {
    const item = localStorage.getItem(CACHE_VERSION + '_' + key);
    if (!item) return null;
    const { data, expires } = JSON.parse(item);
    if (Date.now() > expires) {
      localStorage.removeItem(CACHE_VERSION + '_' + key);
      return null;
    }
    return data;
  } catch { return null; }
};

export const setCache = (key, data, ttlMs = 60000) => {
  try {
    localStorage.setItem(CACHE_VERSION + '_' + key, JSON.stringify({
      data,
      expires: Date.now() + ttlMs,
    }));
  } catch {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_VERSION));
      keys.forEach(k => localStorage.removeItem(k));
    } catch {}
  }
};

export const clearCache = (key) => {
  try { localStorage.removeItem(CACHE_VERSION + '_' + key); } catch {}
};
