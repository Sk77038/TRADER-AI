import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

console.log("Trader AI: Booting System...");

const container = document.getElementById('root');

if (container) {
  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("Trader AI: Root Rendered.");
  } catch (error) {
    console.error("Critical Runtime Error during mount:", error);
    container.innerHTML = `
      <div style="background: #010409; color: #ef4444; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif; text-align: center; padding: 2rem;">
        <h1 style="margin-bottom: 1rem;">System Error</h1>
        <p style="color: #94a3b8; max-width: 400px; margin-bottom: 2rem;">Trader AI failed to initialize. This is usually due to a browser compatibility issue or a module conflict.</p>
        <div style="background: #1e293b; padding: 1rem; border-radius: 0.5rem; text-align: left; font-size: 0.75rem; overflow: auto; max-width: 100%;">
          <code>${error instanceof Error ? error.stack : String(error)}</code>
        </div>
        <button onclick="window.location.reload()" style="margin-top: 2rem; background: #2563eb; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; font-weight: bold;">Retry Initialization</button>
      </div>
    `;
  }
} else {
  console.error("Fatal Error: DOM Root element not found.");
}