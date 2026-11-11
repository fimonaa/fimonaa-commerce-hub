import type { Config } from 'jest';

const config: Config = {
  rootDir: '.',

  // Discover only integration tests in the dedicated test directory.
  testMatch: ['<rootDir>/test/**/*.integration-spec.ts'],

  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.test.json',
      },
    ],
  },

  // Load the isolated test environment before importing AppModule.
  setupFiles: [
    'reflect-metadata',
    '<rootDir>/test/helpers/load-test-environment.ts',
  ],

  testEnvironment: 'node',

  // Database-backed integration suites must run sequentially.
  maxWorkers: 1,

  clearMocks: true,
};

export default config;
