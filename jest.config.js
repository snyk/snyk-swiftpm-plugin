module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts)?$': ['ts-jest', { tsconfig: 'test/tsconfig.json' }],
  },
  testMatch: ['**/*.spec.ts'],
  collectCoverage: false,
  moduleFileExtensions: ['ts', 'js', 'json'],
  forceExit: true,
};
