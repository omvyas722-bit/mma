import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
    headless: false,
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: 'setup',
      testMatch: 'auth.setup.js',
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/auth.json',
      },
      dependencies: ['setup'],
    },
  ],
  webServer: [
    {
      command: 'cd ../backend && node server.js',
      port: 3001,
      timeout: 60000,
      reuseExistingServer: true,
    },
    {
      command: 'npm run dev',
      port: 5174,
      timeout: 60000,
      reuseExistingServer: true,
    },
  ],
});
