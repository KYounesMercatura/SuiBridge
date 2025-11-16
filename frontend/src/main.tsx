import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../app';
import '../index.css';

// ✅ FIXED: Use the correct ID from index.html
const root = createRoot(document.getElementById('icbridge-root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);