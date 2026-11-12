import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Development only: lets the Worker be driven from the browser console and from E2E tests.
if (import.meta.env.DEV) {
  void import('./worker/client').then(({ createWrappedClient }) => {
    Object.assign(window, { __wrappsapp: { createWrappedClient } });
  });
}
