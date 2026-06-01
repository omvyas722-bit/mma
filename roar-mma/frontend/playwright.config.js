import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'cd ../backend && node server.js',
      port: 3001,
      timeout: 15000,
      reuseExistingServer: true,
    },
    {
      command: 'npm run dev',
      port: 5173,
      timeout: 15000,
      reuseExistingServer: false,
    },
  ],
});
