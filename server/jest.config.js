/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  // Los tests E2E de Playwright viven en /e2e (raíz del repo) y no deben correr con Jest.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/../e2e/'],
  globalSetup: '<rootDir>/tests/globalSetup.ts',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/index.ts', '!src/types/**'],
  coverageReporters: ['text', 'lcov'],
  testTimeout: 20000,
};
