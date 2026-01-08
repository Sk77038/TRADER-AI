import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');

if (container) {
  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Failed to render React app:", error);
    container.innerHTML = `<div style="color: white; padding: 20px; font-family: sans-serif;">
      <h1>System Error</h1>
      <p>Failed to initialize Trader AI. Check console for details.</p>
      <pre style="color: red;">${error instanceof Error ? error.message : String(error)}</pre>
    </div>`;
  }
} else {
  console.error("Critical Error: Root container '#root' not found in DOM.");
}