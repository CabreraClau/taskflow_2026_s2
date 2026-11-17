import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de los tests E2E (Playwright) de TaskFlow.
 *
 * npm run test:e2e prepara una SQLite temporal vacía mediante migraciones.
 * Las fixtures crean los datos de cada caso, sin seed ni db:reset.
 * API 3100 y Vite 5174 son exclusivos del test: un servidor existente provoca
 * un error de arranque, para no ejecutar la suite contra datos de desarrollo.
 */
export default defineConfig({
  testDir: './e2e',
  // SQLite no soporta bien escrituras concurrentes: corremos en serie.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  outputDir: '.audit/playwright/test-results',
  reporter: [['list'], ['html', { open: 'never', outputFolder: '.audit/playwright/report' }]],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://127.0.0.1:5174',
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
      command: 'node e2e/support/start-api.cjs',
      url: 'http://127.0.0.1:3100/api/health',
      reuseExistingServer: false,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
      timeout: 120_000,
      env: { TZ: 'America/Montevideo' },
      stdout: 'pipe',
    },
    {
      command: 'npm --prefix client run dev -- --host 127.0.0.1 --port 5174 --strictPort',
      url: 'http://127.0.0.1:5174',
      reuseExistingServer: false,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
      timeout: 120_000,
      env: { TASKFLOW_API_URL: 'http://127.0.0.1:3100' },
    },
  ],
});
