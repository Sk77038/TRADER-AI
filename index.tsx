import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

console.log("Trader AI: System Initializing...");

const container = document.getElementById('root');

if (container) {
  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("Trader AI: System Mounted Successfully.");
  } catch (error) {
    console.error("Mounting Error:", error);
    container.innerHTML = `
      <div style="background: #010409; color: white; height: 100vh; display: flex; align-items: center; justify-content: center; font-family: sans-serif; text-align: center; padding: 20px;">
        <div>
          <h1 style="color: #ef4444;">System Boot Failed</h1>
          <p style="color: #94a3b8;">Trader AI encountered a critical startup error.</p>
          <pre style="background: #1e293b; padding: 15px; border-radius: 10px; margin-top: 20px; font-size: 11px; text-align: left; overflow: auto; max-width: 80vw;">${error instanceof Error ? error.stack : String(error)}</pre>
          <button onclick="window.location.reload()" style="margin-top: 20px; background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: bold;">Retry Initialization</button>
        </div>
      </div>
    `;
  }
} else {
  console.error("Critical Error: #root element missing in HTML template.");
}