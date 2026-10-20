import type { Config } from 'jest';

const config: Config = {
  // Keep unit tests within the API source tree.
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],

  // Compile TypeScript test files with the API's TypeScript settings.
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },

  // Load reflection metadata before importing decorated DTO classes.
  // class-transformer and NestJS rely on this metadata at runtime.
  setupFiles: ['reflect-metadata'],

  // Generate coverage reports when explicitly requested.
  collectCoverageFrom: [
    'src/**/*.service.ts',
    'src/**/*.controller.ts',
    '!src/**/*.spec.ts',
  ],
  coverageDirectory: 'coverage',

  // NestJS API tests run in Node, not a browser environment.
  testEnvironment: 'node',

  // Reset mock call history between tests.
  clearMocks: true,
};

export default config;