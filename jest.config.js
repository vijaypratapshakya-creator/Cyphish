export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/tests/**/*.test.js', '**/tests/**/*.spec.js'],
  testPathIgnorePatterns: ['/node_modules/', '/client/'],
  coveragePathIgnorePatterns: ['/node_modules/', '/client/', '/build/'],
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
};