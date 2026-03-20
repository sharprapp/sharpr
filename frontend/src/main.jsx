import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// First thing — wake up Railway backend before anything renders
fetch(`${import.meta.env.VITE_API_URL}/api/health`).catch(() => {});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
