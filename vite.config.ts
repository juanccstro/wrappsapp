import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vitest/config';
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

/**
 * Public address of the site, for the link-preview tags in index.html (chat apps only show
 * the picture if its URL is absolute). In order: SITE_URL if set by hand (e.g. a custom
 * domain), the production domain Vercel exposes while building, or nothing, which leaves the
 * paths relative (fine for local development).
 */
function siteUrl(): string {
  const explicit = process.env.SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, '');
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  return host ? `https://${host}` : '';
}

const linkPreview = (): Plugin => ({
  name: 'wrappsapp-link-preview',
  transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', siteUrl()),
});

export default defineConfig({
  plugins: [react(), tailwindcss(), linkPreview()],
  // The Worker loads JSZip on demand, which needs an ES module worker.
  worker: { format: 'es' },
  preview: { headers: securityHeaders },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
  },
});
