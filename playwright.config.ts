import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de los tests E2E (Playwright) de TaskFlow.
 *
 * Requisitos previos: la base de datos tiene que estar sembrada. Antes de
 * correr los tests ejecutá `npm run db:reset` una vez. El `webServer` levanta
 * la API (puerto 3000) y el cliente Vite (puerto 5173) automáticamente; si ya
 * los tenés corriendo con `npm run dev`, se reutilizan.
 */
export default defineConfig({
  testDir: './e2e',
  // SQLite no soporta bien escrituras concurrentes: corremos en serie.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:5173',
    // Fijamos una zona horaria UTC-3 para que el bug de fechas de US-16 sea
    // reproducible en cualquier máquina.
    timezoneId: 'America/Montevideo',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run dev:server',
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { TZ: 'America/Montevideo' },
    },
    {
      command: 'npm run dev:client',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
