/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { lib: ['ES2022', 'DOM'] } }],
  },
  testEnvironment: 'node',
  testMatch: ['**/contract-tests/**/*.pact.test.ts'],
  // Esquema vacío en SQLite temporal, sin usar la base de desarrollo.
  globalSetup: '<rootDir>/tests/globalSetup.ts',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
};
