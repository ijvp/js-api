module.exports = {
  testMatch: [
    '**/test/**/*test.ts',
    '**/*test.ts',
    '!**/mocha/**',
    '!**/playground/**',
    '!**/*test-helper*',
    '!**/*anti-pattern*', // Uncomment this only when you want to inspect the consequences of anti-patterns
    '!**/*performance*', //Uncomment this only when you want to inspect the performance of tests
  ],
  // collectCoverage: true,
  // coverageReporters: ['text-summary', 'lcov'],
  // collectCoverageFrom: ['**/*.ts', '!**/node_modules/**', '!**/test/**'],
  forceExit: true,
  notify: true,
  globalSetup: '<rootDir>/__tests__/settings/global-setup.ts',
  globalTeardown: '<rootDir>/__tests__/settings/global-teardown.ts',
  notifyMode: 'change',
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: process.cwd(),
  moduleFileExtensions: ['ts', 'js']
};