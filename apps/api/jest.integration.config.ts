import type { Config } from 'jest';

const config: Config = {
  rootDir: '.',

  // Integration tests are separate from ordinary unit tests.
  testMatch: ['<rootDir>/test/**/*.integration-spec.ts'],

  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },

  setupFiles: [
    'reflect-metadata',
    '<rootDir>/test/helpers/load-test-environment.ts',
  ],

  testEnvironment: 'node',

  // Run database integration tests sequentially.
  maxWorkers: 1,

  clearMocks: true,
};

export default config;
