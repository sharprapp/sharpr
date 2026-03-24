import React from 'react';
import ReactDOM from 'react-dom/client';
import posthog from 'posthog-js';
import App from './App';
import './index.css';

// PostHog analytics
if (import.meta.env.VITE_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
  });
}

// First thing — wake up Railway backend before anything renders
fetch(`${import.meta.env.VITE_API_URL}/api/health`).catch(() => {});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
