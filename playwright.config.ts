import { defineConfig, devices } from '@playwright/test';

/** Smoke test of the real production build, served with its security headers. */
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  retries: 0,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4173', ...devices['Pixel 7'] },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
