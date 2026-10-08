// Un proyecto de Jest por nivel de la pirámide de pruebas, para poder
// ejecutarlos y contarlos por separado (`--selectProjects unit`, etc.).
const base = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: __dirname,
  testEnvironment: 'node',
  transform: { '^.+\.ts$': 'ts-jest' },
};

/** @type {import('jest').Config} */
module.exports = {
  projects: [
    { ...base, displayName: 'unit', testMatch: ['<rootDir>/src/**/*.spec.ts'] },
    {
      ...base,
      displayName: 'integration',
      testMatch: ['<rootDir>/test/integration/**/*.int-spec.ts'],
    },
    {
      ...base,
      displayName: 'e2e',
      testMatch: ['<rootDir>/test/e2e/**/*.e2e-spec.ts'],
    },
    {
      ...base,
      displayName: 'bdd',
      testMatch: ['<rootDir>/test/bdd/**/*.steps.ts'],
    },
  ],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/main.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text-summary', 'text', 'lcov'],
};
