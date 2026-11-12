import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * `npm run preview` serves the build with the same security headers as production
 * (vercel.json), so the Content Security Policy can be tested locally and in the E2E test.
 * The policy only allows connections to this same origin: a chat cannot be sent anywhere.
 */
type VercelConfig = { headers: { source: string; headers: { key: string; value: string }[] }[] };
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as VercelConfig;
const securityHeaders = Object.fromEntries(
  (vercel.headers.find((h) => h.source === '/(.*)')?.headers ?? []).map((h) => [h.key, h.value]),
);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The Worker loads JSZip on demand, which needs an ES module worker.
  worker: { format: 'es' },
  preview: { headers: securityHeaders },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
  },
});
