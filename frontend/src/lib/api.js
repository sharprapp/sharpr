import axios from 'axios';
import { supabase } from './supabase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' }
});

// Attach Supabase JWT to every request automatically
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// Handle 403 upgrade prompts globally
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.data?.upgrade) {
      // Dispatch a custom event the UpgradeModal can listen for
      window.dispatchEvent(new CustomEvent('upgrade-required', {
        detail: { message: err.response.data.message }
      }));
      window.dispatchEvent(new CustomEvent('open-upgrade'));
    }
    return Promise.reject(err);
  }
);

export default api;
